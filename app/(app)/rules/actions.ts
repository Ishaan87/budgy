"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { rules } from "@/lib/db/schema";
import { requireUserId } from "@/lib/supabase/server";
import { previewRuleMatches, ruleConditionSchema } from "@/lib/rules/engine";
import { listRecentTransactionsForPreview } from "@/lib/db/queries/rules";

const ruleFormSchema = z.object({
  match: z.array(ruleConditionSchema).min(1),
  categoryId: z.string().uuid(),
  tags: z.array(z.string()).default([]),
});
export type RuleFormValues = z.infer<typeof ruleFormSchema>;

export async function previewRule(match: RuleFormValues["match"]) {
  const userId = await requireUserId();
  const parsed = z.array(ruleConditionSchema).min(1).parse(match);
  const recent = await listRecentTransactionsForPreview(userId);
  return previewRuleMatches({ id: "preview", priority: 0, isActive: true, match: parsed, set: { categoryId: "x" } }, recent);
}

export async function createRule(input: RuleFormValues, createdFrom: "manual" | "learned" = "manual") {
  const userId = await requireUserId();
  const data = ruleFormSchema.parse(input);

  const [{ maxPriority }] = await db
    .select({ maxPriority: sql<number>`coalesce(max(${rules.priority}), -1)::int` })
    .from(rules)
    .where(eq(rules.userId, userId));

  await db.insert(rules).values({
    userId,
    priority: maxPriority + 1,
    match: data.match,
    set: { categoryId: data.categoryId, tags: data.tags },
    createdFrom,
  });

  revalidatePath("/rules");
}

export async function updateRule(ruleId: string, input: RuleFormValues) {
  const userId = await requireUserId();
  const data = ruleFormSchema.parse(input);

  await db
    .update(rules)
    .set({ match: data.match, set: { categoryId: data.categoryId, tags: data.tags }, updatedAt: new Date() })
    .where(and(eq(rules.id, ruleId), eq(rules.userId, userId)));

  revalidatePath("/rules");
}

export async function deleteRule(ruleId: string) {
  const userId = await requireUserId();
  await db.delete(rules).where(and(eq(rules.id, ruleId), eq(rules.userId, userId)));
  revalidatePath("/rules");
}

export async function toggleRuleActive(ruleId: string, isActive: boolean) {
  const userId = await requireUserId();
  await db.update(rules).set({ isActive }).where(and(eq(rules.id, ruleId), eq(rules.userId, userId)));
  revalidatePath("/rules");
}

export async function moveRule(ruleId: string, direction: "up" | "down") {
  const userId = await requireUserId();
  const rows = await db
    .select({ id: rules.id, priority: rules.priority })
    .from(rules)
    .where(eq(rules.userId, userId))
    .orderBy(rules.priority);

  const index = rows.findIndex((r) => r.id === ruleId);
  const swapWithIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWithIndex < 0 || swapWithIndex >= rows.length) return;

  const a = rows[index];
  const b = rows[swapWithIndex];

  await db.transaction(async (tx) => {
    await tx.update(rules).set({ priority: -1 }).where(eq(rules.id, a.id));
    await tx.update(rules).set({ priority: a.priority }).where(eq(rules.id, b.id));
    await tx.update(rules).set({ priority: b.priority }).where(eq(rules.id, a.id));
  });

  revalidatePath("/rules");
}

/** Creates a "merchant contains X" rule from a user's manual correction during NL entry. */
export async function createLearnedMerchantRule(merchant: string, categoryId: string) {
  return createRule(
    { match: [{ field: "merchant", op: "contains", value: merchant.toLowerCase() }], categoryId, tags: [] },
    "learned",
  );
}
