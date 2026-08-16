import { createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { nlParseCache } from "@/lib/db/schema";
import type { NlDraft } from "@/lib/nl/schemas";

export function hashInput(userId: string, normalizedText: string): string {
  return createHash("sha256").update(`${userId}:${normalizedText}`).digest("hex");
}

export function normalizeInput(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function getCachedParse(userId: string, inputHash: string): Promise<NlDraft | null> {
  const [row] = await db
    .select()
    .from(nlParseCache)
    .where(and(eq(nlParseCache.userId, userId), eq(nlParseCache.inputHash, inputHash)));
  return row ? (row.result as NlDraft) : null;
}

export async function setCachedParse(
  userId: string,
  inputHash: string,
  rawInput: string,
  result: NlDraft,
  modelUsed: string | null,
) {
  await db
    .insert(nlParseCache)
    .values({ userId, inputHash, rawInput, result, modelUsed })
    .onConflictDoUpdate({
      target: [nlParseCache.userId, nlParseCache.inputHash],
      set: { result, modelUsed },
    });
}
