import {
  getCategoryBreakdown,
  getDailyExpenseTrend,
  getMonthSummary,
  getTopMerchants,
} from "@/lib/db/queries/dashboard";
import { getDebtSummary } from "@/lib/db/queries/debts";
import { projectMonthEnd } from "@/lib/dashboard/projections";
import { requireUserId } from "@/lib/supabase/server";
import { SummaryTiles } from "@/components/dashboard/summary-tiles";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { CalendarHeatmap } from "@/components/dashboard/calendar-heatmap";
import { TopMerchants } from "@/components/dashboard/top-merchants";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const now = new Date();

  const [summary, trend, categories, merchants, debtSummary] = await Promise.all([
    getMonthSummary(userId, now),
    getDailyExpenseTrend(userId, now),
    getCategoryBreakdown(userId, now),
    getTopMerchants(userId, now),
    getDebtSummary(userId),
  ]);

  const { projected } = projectMonthEnd(summary.totalExpense, now);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </p>
      </div>

      <SummaryTiles
        totalExpense={summary.totalExpense}
        totalIncome={summary.totalIncome}
        net={summary.net}
        cashOnHand={summary.cashOnHand}
        projected={projected}
        totalOwedToMe={debtSummary.totalOwedToMe}
        totalIOwe={debtSummary.totalIOwe}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart data={trend} />
        <CategoryDonut data={categories} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CalendarHeatmap data={trend} reference={now} />
        <TopMerchants data={merchants} />
      </div>
    </div>
  );
}
