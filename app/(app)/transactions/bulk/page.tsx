import { listAccountsWithBalances } from "@/lib/db/queries/accounts";
import { listCategories } from "@/lib/db/queries/categories";
import { requireUserId } from "@/lib/supabase/server";
import { BulkImportClient } from "@/components/transactions/bulk-import-client";

export default async function BulkImportPage() {
  const userId = await requireUserId();
  const [accounts, categories] = await Promise.all([listAccountsWithBalances(userId), listCategories(userId)]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bulk import</h1>
        <p className="text-muted-foreground">
          Paste a whole day&apos;s spending, one line each — review before anything is saved.
        </p>
      </div>
      <BulkImportClient
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
      />
    </div>
  );
}
