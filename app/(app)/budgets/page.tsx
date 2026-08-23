import { listBudgetsForMonth } from "@/lib/db/queries/budgets";
import { requireUserId } from "@/lib/supabase/server";
import { MonthSwitcher } from "@/components/month-switcher";
import { BudgetRow } from "@/components/budgets/budget-row";

function parseMonth(value: string | undefined): Date {
  if (!value) return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await requireUserId();
  const { month: monthParam } = await searchParams;
  const month = parseMonth(monthParam);

  const rows = await listBudgetsForMonth(userId, month);

  return (
    <div className="max-w-2xl space-y-4 px-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">Set a monthly limit per category. Leave at ₹0 to skip one.</p>
        </div>
        <MonthSwitcher month={month} />
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <BudgetRow key={row.categoryId} row={row} month={month} />
        ))}
      </div>
    </div>
  );
}
