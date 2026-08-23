import { listAccountsWithBalances } from "@/lib/db/queries/accounts";
import { listCategories } from "@/lib/db/queries/categories";
import { requireUserId } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountFormDialog } from "@/components/accounts/account-form-dialog";
import { CategoryFormDialog } from "@/components/accounts/category-form-dialog";
import { formatINR } from "@/lib/inr";
import { AccountArchiveButton, CategoryArchiveButton } from "./archive-actions";

export default async function AccountsPage() {
  const userId = await requireUserId();
  const [accounts, categories] = await Promise.all([
    listAccountsWithBalances(userId),
    listCategories(userId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Accounts &amp; Categories</h1>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-end">
            <AccountFormDialog />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6">
            {accounts.map((a) => (
              <Card key={a.id} className={a.isArchived ? "opacity-60" : undefined}>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{a.name}</p>
                      <Badge variant="outline" className="mt-1 capitalize">
                        {a.type.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <AccountFormDialog account={a} />
                      <AccountArchiveButton id={a.id} isArchived={a.isArchived} />
                    </div>
                  </div>
                  <p className="text-xl font-semibold tabular-nums">
                    {formatINR(Number(a.currentBalance), { showDecimals: true })}
                  </p>
                  {a.type === "credit_card" && a.creditLimit && (
                    <p className="text-xs text-muted-foreground">
                      Limit {formatINR(Number(a.creditLimit))} · statement day {a.statementDay} ·
                      due {a.dueDay} days after
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <CategoryFormDialog parentOptions={categories} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6">
            {categories.map((c) => (
              <Card key={c.id} className={c.isArchived ? "opacity-60" : undefined}>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-4">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {c.kind}
                    </Badge>
                    {c.parentId && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        under {categories.find((p) => p.id === c.parentId)?.name}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <CategoryFormDialog category={c} parentOptions={categories} />
                    <CategoryArchiveButton id={c.id} isArchived={c.isArchived} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
