import { z } from "zod";

/**
 * Structured output schema the LLM must fill in. Accounts/categories are referenced by name
 * (matched against the user's actual lists we send in the prompt) rather than raw ids, since
 * the model can't reliably invent valid UUIDs — we resolve names to ids ourselves afterward.
 */
export const nlLlmResultSchema = z.object({
  type: z.enum(["expense", "income", "transfer"]),
  amount: z.number().positive(),
  accountName: z.string().nullable(),
  toAccountName: z.string().nullable(),
  categoryName: z.string().nullable(),
  merchant: z.string().nullable(),
  note: z.string().nullable(),
  occurredAtIso: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});
export type NlLlmResult = z.infer<typeof nlLlmResultSchema>;

export type FieldSource = "rule" | "parsed" | "llm" | "default";

/** The draft a user reviews before confirming — resolved to real ids, with per-field provenance. */
export type NlDraft = {
  type: "expense" | "income" | "transfer";
  amount: number | null;
  accountId: string | null;
  toAccountId: string | null;
  categoryId: string | null;
  merchant: string | null;
  note: string | null;
  occurredAt: string;
  tags: string[];
  confidence: number;
  modelUsed: string | null;
  sources: Partial<Record<"type" | "amount" | "accountId" | "toAccountId" | "categoryId" | "occurredAt", FieldSource>>;
};
