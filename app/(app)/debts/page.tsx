import { listDebtsWithBalance } from "@/lib/db/queries/debts";
import { listAccountsWithBalances } from "@/lib/db/queries/accounts";
import { requireUserId } from "@/lib/supabase/server";
import { DebtFormDialog } from "@/components/debts/debt-form-dialog";
import { DebtCard } from "@/components/debts/debt-card";

export default async function DebtsPage() {
  const userId = await requireUserId();
  const [debts, accounts] = await Promise.all([listDebtsWithBalance(userId), listAccountsWithBalances(userId)]);

  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));
  const owedToMe = debts.filter((d) => d.direction === "owed_to_me" && !d.isSettled);
  const iOwe = debts.filter((d) => d.direction === "i_owe" && !d.isSettled);
  const settled = debts.filter((d) => d.isSettled);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Debts</h1>
          <p className="text-muted-foreground">Who owes you, and what you owe.</p>
        </div>
        <DebtFormDialog />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Owed to me</h2>
          {owedToMe.length === 0 && <p className="text-sm text-muted-foreground">Nobody owes you right now.</p>}
          {owedToMe.map((d) => (
            <DebtCard key={d.id} debt={d} accounts={accountOptions} />
          ))}
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">I owe</h2>
          {iOwe.length === 0 && <p className="text-sm text-muted-foreground">You don&apos;t owe anyone right now.</p>}
          {iOwe.map((d) => (
            <DebtCard key={d.id} debt={d} accounts={accountOptions} />
          ))}
        </div>
      </div>

      {settled.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Settled</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6">
            {settled.map((d) => (
              <DebtCard key={d.id} debt={d} accounts={accountOptions} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
