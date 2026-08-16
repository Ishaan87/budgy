import { listAccountsWithBalances } from "@/lib/db/queries/accounts";
import { listCategories } from "@/lib/db/queries/categories";
import { listTransactions } from "@/lib/db/queries/transactions";
import { requireUserId } from "@/lib/supabase/server";
import { transactionFiltersSchema } from "@/lib/validation/transaction";
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { PaginationBar } from "@/components/pagination-bar";
import { Button } from "@/components/ui/button";
import { NotebookPen } from "lucide-react";
import Link from "next/link";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await requireUserId();
  const rawParams = await searchParams;
  const filters = transactionFiltersSchema.parse({
    accountId: rawParams.accountId,
    categoryId: rawParams.categoryId,
    type: rawParams.type,
    search: rawParams.search,
    page: rawParams.page,
  });

  const [accounts, categories, { rows, total }] = await Promise.all([
    listAccountsWithBalances(userId),
    listCategories(userId),
    listTransactions(userId, filters),
  ]);

  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name }));
  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/transactions/bulk" />}>
            <NotebookPen className="size-4" /> Bulk import
          </Button>
          <TransactionFormDialog accounts={accountOptions} categories={categoryOptions} />
        </div>
      </div>

      <TransactionFilters accounts={accountOptions} categories={categoryOptions} />

      <TransactionTable
        rows={rows.map((r) => ({ ...r, occurredAt: r.occurredAt }))}
        accounts={accountOptions}
        categories={categoryOptions}
      />

      <PaginationBar page={filters.page} pageSize={filters.pageSize} total={total} />
    </div>
  );
}
