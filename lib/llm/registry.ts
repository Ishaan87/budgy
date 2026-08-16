import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { llmChain, llmCredentials, llmModelState } from "@/lib/db/schema";
import { decryptSecret } from "./crypto";
import type { LlmProvider } from "./types";

export type ChainEntry = {
  chainId: string;
  provider: LlmProvider;
  model: string;
  apiKey: string;
  status: "ok" | "cooldown" | "disabled";
  cooldownUntil: Date | null;
};

/** Loads the user's LLM chain in priority order, decrypting each credential. */
export async function loadChain(userId: string): Promise<ChainEntry[]> {
  const rows = await db
    .select({
      chainId: llmChain.id,
      provider: llmChain.provider,
      model: llmChain.model,
      enabled: llmChain.enabled,
      ciphertext: llmCredentials.ciphertext,
      iv: llmCredentials.iv,
      authTag: llmCredentials.authTag,
      credentialActive: llmCredentials.isActive,
      status: llmModelState.status,
      cooldownUntil: llmModelState.cooldownUntil,
    })
    .from(llmChain)
    .innerJoin(llmCredentials, eq(llmCredentials.id, llmChain.credentialId))
    .leftJoin(llmModelState, eq(llmModelState.chainId, llmChain.id))
    .where(and(eq(llmChain.userId, userId), eq(llmChain.enabled, true), eq(llmCredentials.isActive, true)))
    .orderBy(asc(llmChain.priority));

  return rows.map((r) => ({
    chainId: r.chainId,
    provider: r.provider,
    model: r.model,
    apiKey: decryptSecret({ ciphertext: r.ciphertext, iv: r.iv, authTag: r.authTag }),
    status: r.status ?? "ok",
    cooldownUntil: r.cooldownUntil,
  }));
}

export async function ensureModelState(userId: string, chainId: string) {
  await db
    .insert(llmModelState)
    .values({ userId, chainId })
    .onConflictDoNothing({ target: llmModelState.chainId });
}
