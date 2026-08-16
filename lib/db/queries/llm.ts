import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { llmChain, llmCredentials, llmModelState } from "@/lib/db/schema";

export async function listCredentials(userId: string) {
  return db
    .select({
      id: llmCredentials.id,
      provider: llmCredentials.provider,
      label: llmCredentials.label,
      keyLast4: llmCredentials.keyLast4,
      isActive: llmCredentials.isActive,
      createdAt: llmCredentials.createdAt,
    })
    .from(llmCredentials)
    .where(eq(llmCredentials.userId, userId))
    .orderBy(asc(llmCredentials.createdAt));
}

export async function listChainWithState(userId: string) {
  const rows = await db
    .select({
      chainId: llmChain.id,
      priority: llmChain.priority,
      provider: llmChain.provider,
      model: llmChain.model,
      enabled: llmChain.enabled,
      credentialId: llmChain.credentialId,
      credentialLabel: llmCredentials.label,
      keyLast4: llmCredentials.keyLast4,
      status: llmModelState.status,
      cooldownUntil: llmModelState.cooldownUntil,
      lastError: llmModelState.lastError,
      callCount: llmModelState.callCount,
      errorCount: llmModelState.errorCount,
      totalTokens: llmModelState.totalTokens,
      estCostUsd: llmModelState.estCostUsd,
    })
    .from(llmChain)
    .innerJoin(llmCredentials, eq(llmCredentials.id, llmChain.credentialId))
    .leftJoin(llmModelState, eq(llmModelState.chainId, llmChain.id))
    .where(eq(llmChain.userId, userId))
    .orderBy(asc(llmChain.priority));

  return rows;
}
