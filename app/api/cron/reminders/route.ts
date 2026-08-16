import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { verifyCronSecret } from "@/lib/cron/auth";

/**
 * Computes budget-overrun and upcoming-card-due-date reminders across all users. There is no
 * email/push channel wired up yet (no provider keys were requested for that), so this returns
 * the computed reminders as JSON — a foundation to plug a notification channel into later.
 */
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthStartTimestamp = monthStart.toISOString();
  const monthEndTimestamp = monthEnd.toISOString();

  const overruns = await db.execute<{
    user_id: string;
    category_name: string;
    budget_amount: string;
    spent: string;
  }>(sql`
    select b.user_id, c.name as category_name, b.amount as budget_amount, coalesce(sum(t.amount), 0) as spent
    from budgets b
    join categories c on c.id = b.category_id
    left join transactions t
      on t.category_id = b.category_id and t.user_id = b.user_id and t.type = 'expense' and t.is_deleted = false
      and t.occurred_at >= ${monthStartTimestamp} and t.occurred_at < ${monthEndTimestamp}
    where b.effective_from = ${monthStart.toISOString().slice(0, 10)}
    group by b.user_id, c.name, b.amount
    having coalesce(sum(t.amount), 0) > b.amount
  `);

  const upcomingCardDues = await db.execute<{
    user_id: string;
    name: string;
    next_due_date: string;
    unbilled_amount: string;
  }>(sql`
    select user_id, name, next_due_date, unbilled_amount
    from v_card_cycles
    where next_due_date <= (current_date + interval '3 days')
  `);

  return NextResponse.json({
    budgetOverruns: overruns.map((r) => ({
      userId: r.user_id,
      category: r.category_name,
      budget: Number(r.budget_amount),
      spent: Number(r.spent),
    })),
    upcomingCardDues: upcomingCardDues.map((r) => ({
      userId: r.user_id,
      card: r.name,
      dueDate: r.next_due_date,
      unbilledAmount: Number(r.unbilled_amount),
    })),
  });
}
