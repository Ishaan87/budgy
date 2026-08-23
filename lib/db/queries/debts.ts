import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { debtEntries, debts } from "@/lib/db/schema";
import { computeDebtBalance } from "@/lib/debts/balance";

export async function listDebtsWithBalance(userId: string) {
  const debtRows = await db.select().from(debts).where(eq(debts.userId, userId)).orderBy(asc(debts.createdAt));
  const entryRows = await db.select().from(debtEntries).where(eq(debtEntries.userId, userId));

  return debtRows.map((d) => {
    const entries = entryRows.filter((e) => e.debtId === d.id);
    const balance = computeDebtBalance(
      d.direction,
      entries.map((e) => ({ type: e.type, amount: Number(e.amount) })),
    );
    return {
      ...d,
      balance,
      entries: entries
        .map((e) => ({ ...e, amount: Number(e.amount) }))
        .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()),
    };
  });
}

/** Outstanding totals across all unsettled debts, for the dashboard summary. */
export async function getDebtSummary(userId: string) {
  const debtsWithBalance = await listDebtsWithBalance(userId);
  const active = debtsWithBalance.filter((d) => !d.isSettled);

  const totalOwedToMe = active
    .filter((d) => d.direction === "owed_to_me")
    .reduce((sum, d) => sum + d.balance, 0);
  const totalIOwe = active
    .filter((d) => d.direction === "i_owe")
    .reduce((sum, d) => sum + d.balance, 0);

  return { totalOwedToMe, totalIOwe };
}
