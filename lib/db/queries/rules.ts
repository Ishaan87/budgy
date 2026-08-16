import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { categories, rules, transactions } from "@/lib/db/schema";
import { ruleMatchSchema, ruleSetSchema, type RuleLike, type MatchableTransaction } from "@/lib/rules/engine";

export async function listActiveRules(userId: string): Promise<RuleLike[]> {
  const all = await listAllRules(userId);
  return all.filter((r) => r.isActive);
}

export async function listAllRules(userId: string): Promise<RuleLike[]> {
  const rows = await db.select().from(rules).where(eq(rules.userId, userId)).orderBy(asc(rules.priority));
  return rows.map((r) => ({
    id: r.id,
    priority: r.priority,
    isActive: r.isActive,
    match: ruleMatchSchema.parse(r.match),
    set: ruleSetSchema.parse(r.set),
  }));
}

export async function listRulesWithCategoryNames(userId: string) {
  const [ruleRows, categoryRows] = await Promise.all([
    db.select().from(rules).where(eq(rules.userId, userId)).orderBy(asc(rules.priority)),
    db.select({ id: categories.id, name: categories.name }).from(categories).where(eq(categories.userId, userId)),
  ]);
  const categoryNameById = new Map(categoryRows.map((c) => [c.id, c.name]));

  return ruleRows.map((r) => {
    const set = ruleSetSchema.parse(r.set);
    return {
      id: r.id,
      priority: r.priority,
      isActive: r.isActive,
      match: ruleMatchSchema.parse(r.match),
      set,
      hitCount: r.hitCount,
      createdFrom: r.createdFrom,
      categoryName: categoryNameById.get(set.categoryId) ?? "Unknown category",
    };
  });
}

export async function incrementRuleHitCount(ruleId: string) {
  await db
    .update(rules)
    .set({ hitCount: sql`${rules.hitCount} + 1` })
    .where(eq(rules.id, ruleId));
}

/** Recent transactions used to preview how many past rows a candidate rule would match. */
export async function listRecentTransactionsForPreview(userId: string, limit = 500): Promise<MatchableTransaction[]> {
  const rows = await db
    .select({ merchant: transactions.merchant, note: transactions.note, accountId: transactions.accountId })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(asc(transactions.occurredAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, text: `${r.merchant ?? ""} ${r.note ?? ""}`.trim() }));
}
