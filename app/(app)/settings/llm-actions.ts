"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { llmChain, llmCredentials, llmModelState } from "@/lib/db/schema";
import { requireUserId } from "@/lib/supabase/server";
import { encryptSecret, last4 } from "@/lib/llm/crypto";
import type { LlmProvider } from "@/lib/llm/types";

const addCredentialSchema = z.object({
  provider: z.enum(["openrouter", "gemini", "huggingface"]),
  label: z.string().trim().min(1).max(60),
  apiKey: z.string().trim().min(10, "That doesn't look like a valid API key"),
});

export async function addCredential(input: z.infer<typeof addCredentialSchema>) {
  const userId = await requireUserId();
  const data = addCredentialSchema.parse(input);
  const encrypted = encryptSecret(data.apiKey);

  const [created] = await db
    .insert(llmCredentials)
    .values({
      userId,
      provider: data.provider,
      label: data.label,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      keyLast4: last4(data.apiKey),
    })
    .returning();

  revalidatePath("/settings");
  return { id: created.id };
}

export async function removeCredential(credentialId: string) {
  const userId = await requireUserId();
  await db
    .delete(llmCredentials)
    .where(and(eq(llmCredentials.id, credentialId), eq(llmCredentials.userId, userId)));
  revalidatePath("/settings");
}

const addChainEntrySchema = z.object({
  credentialId: z.string().uuid(),
  provider: z.enum(["openrouter", "gemini", "huggingface"]),
  model: z.string().trim().min(1),
});

export async function addChainEntry(input: z.infer<typeof addChainEntrySchema>) {
  const userId = await requireUserId();
  const data = addChainEntrySchema.parse(input);

  const [{ maxPriority }] = await db
    .select({ maxPriority: sql<number>`coalesce(max(${llmChain.priority}), 0)::int` })
    .from(llmChain)
    .where(eq(llmChain.userId, userId));

  const [created] = await db
    .insert(llmChain)
    .values({
      userId,
      priority: maxPriority + 1,
      provider: data.provider as LlmProvider,
      model: data.model,
      credentialId: data.credentialId,
    })
    .returning();

  await db.insert(llmModelState).values({ userId, chainId: created.id }).onConflictDoNothing();

  revalidatePath("/settings");
}

export async function removeChainEntry(chainId: string) {
  const userId = await requireUserId();
  await db.delete(llmChain).where(and(eq(llmChain.id, chainId), eq(llmChain.userId, userId)));
  revalidatePath("/settings");
}

export async function toggleChainEnabled(chainId: string, enabled: boolean) {
  const userId = await requireUserId();
  await db
    .update(llmChain)
    .set({ enabled })
    .where(and(eq(llmChain.id, chainId), eq(llmChain.userId, userId)));
  revalidatePath("/settings");
}

/** Swaps priority with the adjacent entry in the given direction. */
export async function moveChainEntry(chainId: string, direction: "up" | "down") {
  const userId = await requireUserId();

  const rows = await db
    .select({ id: llmChain.id, priority: llmChain.priority })
    .from(llmChain)
    .where(eq(llmChain.userId, userId))
    .orderBy(llmChain.priority);

  const index = rows.findIndex((r) => r.id === chainId);
  const swapWithIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWithIndex < 0 || swapWithIndex >= rows.length) return;

  const a = rows[index];
  const b = rows[swapWithIndex];

  await db.transaction(async (tx) => {
    // Temporary negative priority avoids colliding with the unique (user_id, priority) index.
    await tx.update(llmChain).set({ priority: -1 }).where(eq(llmChain.id, a.id));
    await tx.update(llmChain).set({ priority: a.priority }).where(eq(llmChain.id, b.id));
    await tx.update(llmChain).set({ priority: b.priority }).where(eq(llmChain.id, a.id));
  });

  revalidatePath("/settings");
}

export async function resetChainCooldown(chainId: string) {
  const userId = await requireUserId();
  await db
    .update(llmModelState)
    .set({ status: "ok", cooldownUntil: null, lastError: null })
    .where(and(eq(llmModelState.chainId, chainId), eq(llmModelState.userId, userId)));
  revalidatePath("/settings");
}
