import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const insertCalls: { table: string; values: Record<string, unknown> }[] = [];

vi.mock("@/lib/db/client", () => {
  return {
    db: {
      insert: (table: unknown) => ({
        values: (values: Record<string, unknown>) => {
          insertCalls.push({ table: String(table), values });
          return {
            onConflictDoUpdate: async () => undefined,
            onConflictDoNothing: async () => undefined,
            then: (resolve: (v: unknown) => void) => resolve(undefined),
          };
        },
      }),
    },
  };
});

vi.mock("@/lib/db/schema", () => ({
  llmCallLog: "llm_call_log",
  llmModelState: "llm_model_state",
}));

const mockChain: {
  chainId: string;
  provider: "openrouter" | "gemini" | "huggingface";
  model: string;
  apiKey: string;
  status: "ok" | "cooldown" | "disabled";
  cooldownUntil: Date | null;
}[] = [];

vi.mock("./registry", () => ({
  loadChain: async () => mockChain,
}));

import { AllProvidersExhausted, complete } from "./router";

const resultSchema = z.object({ amount: z.number(), category: z.string() });

function mockFetchSequence(responses: Array<{ status: number; body?: unknown; headers?: Record<string, string> }>) {
  let call = 0;
  return vi.fn(async () => {
    const r = responses[call] ?? responses[responses.length - 1];
    call += 1;
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      headers: { get: (name: string) => r.headers?.[name.toLowerCase()] ?? null },
      json: async () => r.body,
    } as unknown as Response;
  });
}

function chatCompletionBody(content: string) {
  return { choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 5 } };
}

beforeEach(() => {
  insertCalls.length = 0;
  mockChain.length = 0;
  vi.unstubAllGlobals();
});

describe("llm router", () => {
  it("falls through 429 -> 402 -> success across three chain entries", async () => {
    mockChain.push(
      { chainId: "c1", provider: "openrouter", model: "model-a", apiKey: "k1", status: "ok", cooldownUntil: null },
      { chainId: "c2", provider: "openrouter", model: "model-b", apiKey: "k2", status: "ok", cooldownUntil: null },
      { chainId: "c3", provider: "openrouter", model: "model-c", apiKey: "k3", status: "ok", cooldownUntil: null },
    );

    vi.stubGlobal(
      "fetch",
      mockFetchSequence([
        { status: 429, headers: { "retry-after": "30" } },
        { status: 402 },
        { status: 200, body: chatCompletionBody(JSON.stringify({ amount: 50, category: "Food" })) },
      ]),
    );

    const result = await complete({
      userId: "u1",
      purpose: "nl_parse",
      schema: resultSchema,
      schemaName: "parse_result",
      system: "sys",
      user: "50rs momos",
    });

    expect(result.data).toEqual({ amount: 50, category: "Food" });
    expect(result.modelUsed).toBe("model-c");

    const modelStateWrites = insertCalls.filter((c) => c.table === "llm_model_state");
    expect(modelStateWrites).toHaveLength(3);
    expect(modelStateWrites[0].values.status).toBe("cooldown");
    expect((modelStateWrites[0].values.cooldownUntil as Date | undefined)?.getTime()).toBeGreaterThan(Date.now());
    expect(modelStateWrites[1].values.status).toBe("cooldown");
    expect(modelStateWrites[2].values.status).toBe("ok");
  });

  it("throws AllProvidersExhausted and disables models on repeated auth errors", async () => {
    mockChain.push(
      { chainId: "c1", provider: "openrouter", model: "model-a", apiKey: "k1", status: "ok", cooldownUntil: null },
      { chainId: "c2", provider: "openrouter", model: "model-b", apiKey: "k2", status: "ok", cooldownUntil: null },
    );

    vi.stubGlobal("fetch", mockFetchSequence([{ status: 401 }, { status: 401 }]));

    await expect(
      complete({
        userId: "u1",
        purpose: "nl_parse",
        schema: resultSchema,
        schemaName: "parse_result",
        system: "sys",
        user: "50rs momos",
      }),
    ).rejects.toBeInstanceOf(AllProvidersExhausted);

    const modelStateWrites = insertCalls.filter((c) => c.table === "llm_model_state");
    expect(modelStateWrites.every((w) => w.values.status === "disabled")).toBe(true);
  });

  it("repairs malformed output once on the same model before falling through", async () => {
    mockChain.push({
      chainId: "c1",
      provider: "openrouter",
      model: "model-a",
      apiKey: "k1",
      status: "ok",
      cooldownUntil: null,
    });

    vi.stubGlobal(
      "fetch",
      mockFetchSequence([
        { status: 200, body: chatCompletionBody("not json at all") },
        { status: 200, body: chatCompletionBody(JSON.stringify({ amount: 20, category: "Chai" })) },
      ]),
    );

    const result = await complete({
      userId: "u1",
      purpose: "nl_parse",
      schema: resultSchema,
      schemaName: "parse_result",
      system: "sys",
      user: "chai 20",
    });

    expect(result.data).toEqual({ amount: 20, category: "Chai" });
    const modelStateWrites = insertCalls.filter((c) => c.table === "llm_model_state");
    expect(modelStateWrites[0].values.status).toBe("ok");
  });

  it("skips a model whose cooldown has not expired", async () => {
    mockChain.push(
      {
        chainId: "c1",
        provider: "openrouter",
        model: "cooling-down",
        apiKey: "k1",
        status: "cooldown",
        cooldownUntil: new Date(Date.now() + 60_000),
      },
      { chainId: "c2", provider: "openrouter", model: "model-b", apiKey: "k2", status: "ok", cooldownUntil: null },
    );

    vi.stubGlobal(
      "fetch",
      mockFetchSequence([{ status: 200, body: chatCompletionBody(JSON.stringify({ amount: 1, category: "x" })) }]),
    );

    const result = await complete({
      userId: "u1",
      purpose: "nl_parse",
      schema: resultSchema,
      schemaName: "parse_result",
      system: "sys",
      user: "test",
    });

    expect(result.modelUsed).toBe("model-b");
  });
});
