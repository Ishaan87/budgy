import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export type CardCycle = {
  accountId: string;
  name: string;
  creditLimit: number | null;
  statementDay: number | null;
  dueDay: number | null;
  currentStatementDate: string;
  nextDueDate: string;
  billedAmount: number;
  unbilledAmount: number;
};

/** Reads from the v_card_cycles view (hand-written in migration 0001). */
export async function listCardCycles(userId: string): Promise<CardCycle[]> {
  const rows = await db.execute<{
    account_id: string;
    name: string;
    credit_limit: string | null;
    statement_day: number | null;
    due_day: number | null;
    current_statement_date: string;
    next_due_date: string;
    billed_amount: string;
    unbilled_amount: string;
  }>(sql`
    select account_id, name, credit_limit, statement_day, due_day,
           current_statement_date, next_due_date, billed_amount, unbilled_amount
    from v_card_cycles
    where user_id = ${userId}
    order by next_due_date
  `);

  return rows.map((r) => ({
    accountId: r.account_id,
    name: r.name,
    creditLimit: r.credit_limit ? Number(r.credit_limit) : null,
    statementDay: r.statement_day,
    dueDay: r.due_day,
    currentStatementDate: r.current_statement_date,
    nextDueDate: r.next_due_date,
    billedAmount: Number(r.billed_amount),
    unbilledAmount: Number(r.unbilled_amount),
  }));
}
