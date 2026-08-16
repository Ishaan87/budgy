import { listRecurringRules } from "@/lib/db/queries/recurring";
import { listAccountsWithBalances } from "@/lib/db/queries/accounts";
import { listCategories } from "@/lib/db/queries/categories";
import { requireUserId } from "@/lib/supabase/server";
import { RecurringFormDialog } from "@/components/recurring/recurring-form-dialog";
import { RecurringList } from "@/components/recurring/recurring-list";

export default async function RecurringPage() {
  const userId = await requireUserId();
  const [rules, accounts, categories] = await Promise.all([
    listRecurringRules(userId),
    listAccountsWithBalances(userId),
    listCategories(userId),
  ]);

  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }));

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recurring transactions</h1>
          <p className="text-muted-foreground">Rent, subscriptions, salary — posted automatically on schedule.</p>
        </div>
        <RecurringFormDialog accounts={accountOptions} categories={categoryOptions} />
      </div>
      <RecurringList rows={rules} accounts={accountOptions} categories={categoryOptions} />
    </div>
  );
}
