import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export type MonthSummary = {
  totalExpense: number;
  totalIncome: number;
  net: number;
  cashOnHand: number;
};

function monthBounds(reference: Date) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 1);
  // Raw Drizzle SQL parameters do not have the timestamp column encoder that
  // regular table queries use. Pass ISO strings so postgres can serialize them.
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getMonthSummary(userId: string, reference: Date): Promise<MonthSummary> {
  const { start, end } = monthBounds(reference);

  const [row] = await db.execute<{ total_expense: string; total_income: string }>(sql`
    select
      coalesce(sum(case when type = 'expense' then amount else 0 end), 0) as total_expense,
      coalesce(sum(case when type = 'income' then amount else 0 end), 0) as total_income
    from transactions
    where user_id = ${userId} and is_deleted = false and occurred_at >= ${start} and occurred_at < ${end}
  `);

  const [cashRow] = await db.execute<{ cash: string }>(sql`
    select coalesce(sum(current_balance), 0) as cash
    from v_account_balances
    where user_id = ${userId} and type != 'credit_card'
  `);

  const totalExpense = Number(row?.total_expense ?? 0);
  const totalIncome = Number(row?.total_income ?? 0);

  return {
    totalExpense,
    totalIncome,
    net: totalIncome - totalExpense,
    cashOnHand: Number(cashRow?.cash ?? 0),
  };
}

export type DailyPoint = { date: string; amount: number };

export async function getDailyExpenseTrend(userId: string, reference: Date): Promise<DailyPoint[]> {
  const { start, end } = monthBounds(reference);
  const rows = await db.execute<{ day: string; amount: string }>(sql`
    select to_char(occurred_at, 'YYYY-MM-DD') as day, sum(amount) as amount
    from transactions
    where user_id = ${userId} and is_deleted = false and type = 'expense'
      and occurred_at >= ${start} and occurred_at < ${end}
    group by day
    order by day
  `);
  return rows.map((r) => ({ date: r.day, amount: Number(r.amount) }));
}

export type CategorySlice = { categoryId: string; categoryName: string; amount: number };

export async function getCategoryBreakdown(userId: string, reference: Date): Promise<CategorySlice[]> {
  const { start, end } = monthBounds(reference);
  const rows = await db.execute<{ category_id: string; category_name: string; amount: string }>(sql`
    select category_id, category_name, sum(total_amount) as amount
    from v_monthly_category_spend
    where user_id = ${userId} and month >= ${start} and month < ${end}
    group by category_id, category_name
    order by amount desc
  `);
  return rows.map((r) => ({ categoryId: r.category_id, categoryName: r.category_name, amount: Number(r.amount) }));
}

export type MerchantTotal = { merchant: string; amount: number; count: number };

export async function getTopMerchants(userId: string, reference: Date, limit = 5): Promise<MerchantTotal[]> {
  const { start, end } = monthBounds(reference);
  const rows = await db.execute<{ merchant: string; amount: string; count: string }>(sql`
    select merchant, sum(amount) as amount, count(*) as count
    from transactions
    where user_id = ${userId} and is_deleted = false and type = 'expense' and merchant is not null and merchant != ''
      and occurred_at >= ${start} and occurred_at < ${end}
    group by merchant
    order by amount desc
    limit ${limit}
  `);
  return rows.map((r) => ({ merchant: r.merchant, amount: Number(r.amount), count: Number(r.count) }));
}
