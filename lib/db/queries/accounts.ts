import { and, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accountAliases, accounts } from "@/lib/db/schema";

export type AccountWithBalance = {
  id: string;
  name: string;
  type: (typeof accounts.type.enumValues)[number];
  openingBalance: string;
  creditLimit: string | null;
  statementDay: number | null;
  dueDay: number | null;
  icon: string | null;
  color: string | null;
  isArchived: boolean;
  currentBalance: string;
};

/** Reads from the v_account_balances view (hand-written in migration 0001). */
export async function listAccountsWithBalances(userId: string): Promise<AccountWithBalance[]> {
  const rows = await db.execute<{
    account_id: string;
    name: string;
    type: string;
    current_balance: string;
  }>(sql`
    select v.account_id, v.name, v.type, v.current_balance
    from v_account_balances v
    where v.user_id = ${userId}
    order by v.name
  `);

  const accountRows = await db.select().from(accounts).where(eq(accounts.userId, userId));
  const balanceByAccountId = new Map(rows.map((r) => [r.account_id, r.current_balance]));

  return accountRows
    .map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      openingBalance: a.openingBalance,
      creditLimit: a.creditLimit,
      statementDay: a.statementDay,
      dueDay: a.dueDay,
      icon: a.icon,
      color: a.color,
      isArchived: a.isArchived,
      currentBalance: balanceByAccountId.get(a.id) ?? a.openingBalance,
    }))
    .sort((a, b) => Number(a.isArchived) - Number(b.isArchived) || a.name.localeCompare(b.name));
}

export async function getAccount(userId: string, accountId: string) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  return account ?? null;
}

export async function listAccountAliases(userId: string) {
  return db
    .select({ alias: accountAliases.alias, accountId: accountAliases.accountId })
    .from(accountAliases)
    .where(eq(accountAliases.userId, userId));
}
