import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { llmCallLog, llmModelState } from "@/lib/db/schema";
import { loadChain, type ChainEntry } from "./registry";
import { openrouterAdapter } from "./adapters/openrouter";
import { geminiAdapter } from "./adapters/gemini";
import { huggingfaceAdapter } from "./adapters/huggingface";
import { LlmAdapterError, type LlmAdapter, type LlmProvider } from "./types";

const ADAPTERS: Record<LlmProvider, LlmAdapter> = {
  openrouter: openrouterAdapter,
  gemini: geminiAdapter,
  huggingface: huggingfaceAdapter,
};

export class AllProvidersExhausted extends Error {
  constructor(public attempts: { provider: LlmProvider; model: string; reason: string }[]) {
    super(
      `All LLM providers exhausted: ${attempts.map((a) => `${a.provider}/${a.model} (${a.reason})`).join(", ")}`,
    );
    this.name = "AllProvidersExhausted";
  }
}

export type LlmCallPurpose =
  | "nl_parse"
  | "nl_parse_bulk"
  | "nl_analytics_query"
  | "nl_analytics_answer"
  | "repair";

type CompleteParams<T> = {
  userId: string;
  purpose: LlmCallPurpose;
  schema: z.ZodType<T>;
  schemaName: string;
  system: string;
  user: string;
};

type CompleteResult<T> = {
  data: T;
  modelUsed: string;
  provider: LlmProvider;
};

const RATE_LIMIT_DEFAULT_MS = 60_000;
const SERVER_RETRY_JITTER_MS = 400;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recordOutcome(params: {
  userId: string;
  chainId: string;
  provider: LlmProvider;
  model: string;
  purpose: LlmCallPurpose;
  ok: boolean;
  errorCode?: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  cooldownUntil?: Date;
  status?: "ok" | "cooldown" | "disabled";
  lastError?: string;
}) {
  await db.insert(llmCallLog).values({
    userId: params.userId,
    chainId: params.chainId,
    purpose: params.purpose,
    provider: params.provider,
    model: params.model,
    ok: params.ok,
    errorCode: params.errorCode,
    latencyMs: params.latencyMs,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
  });

  await db
    .insert(llmModelState)
    .values({
      userId: params.userId,
      chainId: params.chainId,
      status: params.status ?? "ok",
      cooldownUntil: params.cooldownUntil,
      lastError: params.lastError,
      callCount: params.ok ? 1 : 0,
      errorCount: params.ok ? 0 : 1,
      totalTokens: (params.inputTokens ?? 0) + (params.outputTokens ?? 0),
    })
    .onConflictDoUpdate({
      target: llmModelState.chainId,
      set: {
        status: params.status ?? "ok",
        cooldownUntil: params.cooldownUntil ?? null,
        lastError: params.lastError ?? null,
        callCount: sql`${llmModelState.callCount} + ${params.ok ? 1 : 0}`,
        errorCount: sql`${llmModelState.errorCount} + ${params.ok ? 0 : 1}`,
        totalTokens: sql`${llmModelState.totalTokens} + ${(params.inputTokens ?? 0) + (params.outputTokens ?? 0)}`,
        updatedAt: new Date(),
      },
    });
}

function isEntryAvailable(entry: ChainEntry): boolean {
  if (entry.status === "disabled") return false;
  if (entry.status === "cooldown" && entry.cooldownUntil && entry.cooldownUntil > new Date()) {
    return false;
  }
  return true;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}

/**
 * Walks the user's LLM chain in priority order, skipping disabled/cooling-down models,
 * validating output against `schema`, and falling through to the next model on any failure.
 * See lib/llm/types.ts for the error taxonomy each adapter maps HTTP failures onto.
 */
export async function complete<T>(params: CompleteParams<T>): Promise<CompleteResult<T>> {
  const chain = await loadChain(params.userId);
  const schemaJson = z.toJSONSchema(params.schema, { target: "draft-7" }) as Record<string, unknown>;

  const attempts: { provider: LlmProvider; model: string; reason: string }[] = [];

  for (const entry of chain) {
    if (!isEntryAvailable(entry)) continue;

    const adapter = ADAPTERS[entry.provider];
    const result = await attemptEntry(adapter, entry, params, schemaJson);

    if (result.ok) {
      return { data: result.data, modelUsed: entry.model, provider: entry.provider };
    }

    attempts.push({ provider: entry.provider, model: entry.model, reason: result.reason });
  }

  throw new AllProvidersExhausted(attempts);
}

async function attemptEntry<T>(
  adapter: LlmAdapter,
  entry: ChainEntry,
  params: CompleteParams<T>,
  jsonSchema: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; reason: string }> {
  const start = Date.now();

  const runOnce = () =>
    adapter.complete({
      apiKey: entry.apiKey,
      model: entry.model,
      system: params.system,
      user: params.user,
      jsonSchema,
      schemaName: params.schemaName,
    });

  let raw: Awaited<ReturnType<typeof runOnce>>;
  try {
    raw = await runOnce();
  } catch (err) {
    if (err instanceof LlmAdapterError && err.kind === "SERVER") {
      await sleep(SERVER_RETRY_JITTER_MS + Math.random() * SERVER_RETRY_JITTER_MS);
      try {
        raw = await runOnce();
      } catch (retryErr) {
        return finalizeFailure(entry, params, start, retryErr);
      }
    } else {
      return finalizeFailure(entry, params, start, err);
    }
  }

  const parsed = tryParseAndValidate(raw.text, params.schema);
  if (parsed.ok) {
    await recordOutcome({
      userId: params.userId,
      chainId: entry.chainId,
      provider: entry.provider,
      model: entry.model,
      purpose: params.purpose,
      ok: true,
      latencyMs: Date.now() - start,
      inputTokens: raw.inputTokens,
      outputTokens: raw.outputTokens,
      status: "ok",
    });
    return { ok: true, data: parsed.data };
  }

  // One repair attempt: ask the same model to fix its output against the validation error.
  try {
    const repaired = await adapter.complete({
      apiKey: entry.apiKey,
      model: entry.model,
      system: params.system,
      user: `${params.user}\n\nYour previous response was invalid JSON for the required schema (error: ${parsed.error}). Reply again with ONLY valid JSON matching the schema.`,
      jsonSchema,
      schemaName: params.schemaName,
    });
    const repairedParsed = tryParseAndValidate(repaired.text, params.schema);
    if (repairedParsed.ok) {
      await recordOutcome({
        userId: params.userId,
        chainId: entry.chainId,
        provider: entry.provider,
        model: entry.model,
        purpose: params.purpose,
        ok: true,
        latencyMs: Date.now() - start,
        inputTokens: (raw.inputTokens ?? 0) + (repaired.inputTokens ?? 0),
        outputTokens: (raw.outputTokens ?? 0) + (repaired.outputTokens ?? 0),
        status: "ok",
      });
      return { ok: true, data: repairedParsed.data };
    }
    return finalizeFailure(entry, params, start, new Error(`invalid output after repair: ${repairedParsed.error}`), "INVALID_OUTPUT");
  } catch (err) {
    return finalizeFailure(entry, params, start, err, "INVALID_OUTPUT");
  }
}

function tryParseAndValidate<T>(text: string, schema: z.ZodType<T>): { ok: true; data: T } | { ok: false; error: string } {
  try {
    const json = extractJson(text);
    const result = schema.safeParse(json);
    if (result.success) return { ok: true, data: result.data };
    return { ok: false, error: result.error.message };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "unknown parse error" };
  }
}

async function finalizeFailure<T>(
  entry: ChainEntry,
  params: CompleteParams<T>,
  start: number,
  err: unknown,
  forcedKind?: "INVALID_OUTPUT",
): Promise<{ ok: false; reason: string }> {
  const kind = forcedKind ?? (err instanceof LlmAdapterError ? err.kind : "UNKNOWN");
  const message = err instanceof Error ? err.message : String(err);

  let status: "ok" | "cooldown" | "disabled" = "ok";
  let cooldownUntil: Date | undefined;

  switch (kind) {
    case "RATE_LIMIT": {
      status = "cooldown";
      const ms = (err instanceof LlmAdapterError ? err.retryAfterMs : undefined) ?? RATE_LIMIT_DEFAULT_MS;
      cooldownUntil = new Date(Date.now() + ms);
      break;
    }
    case "QUOTA": {
      status = "cooldown";
      const nextUtcMidnight = new Date();
      nextUtcMidnight.setUTCHours(24, 0, 0, 0);
      cooldownUntil = nextUtcMidnight;
      break;
    }
    case "AUTH":
    case "MODEL_GONE":
      status = "disabled";
      break;
    default:
      status = "ok";
  }

  await recordOutcome({
    userId: params.userId,
    chainId: entry.chainId,
    provider: entry.provider,
    model: entry.model,
    purpose: params.purpose,
    ok: false,
    errorCode: kind,
    latencyMs: Date.now() - start,
    status,
    cooldownUntil,
    lastError: message,
  });

  return { ok: false, reason: `${kind}: ${message}` };
}
