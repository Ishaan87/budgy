import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { budgets, categories } from "@/lib/db/schema";

export type BudgetRow = {
  id: string | null;
  categoryId: string;
  categoryName: string;
  amount: number;
  rollover: boolean;
  spent: number;
  rolloverFromPrevious: number;
};

function monthKey(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** One row per expense category, with this month's budget (if set) and actual spend. */
export async function listBudgetsForMonth(userId: string, reference: Date): Promise<BudgetRow[]> {
  const start = monthKey(reference);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
  // Raw SQL parameters need serializable values; table-column predicates above
  // still use the native Date instances and their column encoders.
  const startTimestamp = start.toISOString();
  const endTimestamp = end.toISOString();
  const prevStartTimestamp = prevStart.toISOString();

  const expenseCategories = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.kind, "expense"), eq(categories.isArchived, false)));

  const currentBudgets = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.effectiveFrom, start.toISOString().slice(0, 10))));

  const previousBudgets = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, userId), eq(budgets.effectiveFrom, prevStart.toISOString().slice(0, 10))));

  const spendRows = await db.execute<{ category_id: string; amount: string }>(sql`
    select category_id, sum(amount) as amount
    from transactions
    where user_id = ${userId} and is_deleted = false and type = 'expense'
      and occurred_at >= ${startTimestamp} and occurred_at < ${endTimestamp}
    group by category_id
  `);
  const spendByCategory = new Map(spendRows.map((r) => [r.category_id, Number(r.amount)]));

  const prevSpendRows = await db.execute<{ category_id: string; amount: string }>(sql`
    select category_id, sum(amount) as amount
    from transactions
    where user_id = ${userId} and is_deleted = false and type = 'expense'
      and occurred_at >= ${prevStartTimestamp} and occurred_at < ${startTimestamp}
    group by category_id
  `);
  const prevSpendByCategory = new Map(prevSpendRows.map((r) => [r.category_id, Number(r.amount)]));

  const currentByCategory = new Map(currentBudgets.map((b) => [b.categoryId, b]));
  const previousByCategory = new Map(previousBudgets.map((b) => [b.categoryId, b]));

  return expenseCategories.map((c) => {
    const current = currentByCategory.get(c.id);
    const previous = previousByCategory.get(c.id);
    let rolloverFromPrevious = 0;
    if (current?.rollover && previous) {
      const previousSpent = prevSpendByCategory.get(c.id) ?? 0;
      rolloverFromPrevious = Math.max(0, Number(previous.amount) - previousSpent);
    }

    return {
      id: current?.id ?? null,
      categoryId: c.id,
      categoryName: c.name,
      amount: current ? Number(current.amount) : 0,
      rollover: current?.rollover ?? false,
      spent: spendByCategory.get(c.id) ?? 0,
      rolloverFromPrevious,
    };
  });
}
