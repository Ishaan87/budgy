"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/inr";
import { categoricalColor } from "@/lib/dashboard/colors";

const MAX_SLICES = 7;

export function CategoryDonut({ data }: { data: { categoryName: string; amount: number }[] }) {
  const sorted = [...data].sort((a, b) => b.amount - a.amount);
  const top = sorted.slice(0, MAX_SLICES);
  const rest = sorted.slice(MAX_SLICES);
  const restTotal = rest.reduce((sum, r) => sum + r.amount, 0);
  const chartData = restTotal > 0 ? [...top, { categoryName: "Other", amount: restTotal }] : top;
  const total = chartData.reduce((sum, d) => sum + d.amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spend by category</CardTitle>
      </CardHeader>
      <CardContent className="h-auto min-h-[220px] w-full sm:h-64 lg:h-[280px]">
        {chartData.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No categorized expenses yet this month.
          </p>
        ) : (
          <div className="flex h-full flex-col items-center gap-4 sm:flex-row">
            <div className="h-[160px] w-full shrink-0 sm:h-full sm:w-[55%]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="amount"
                    nameKey="categoryName"
                    innerRadius="55%"
                    outerRadius="90%"
                    paddingAngle={2}
                    strokeWidth={2}
                    stroke="var(--card)"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.categoryName}
                        fill={entry.categoryName === "Other" ? "#c3c2b7" : categoricalColor(index)}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [formatINR(Number(value), { showDecimals: true }), name]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full flex-1 space-y-1.5 text-xs">
              {chartData.map((entry, index) => (
                <li key={entry.categoryName} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 truncate">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: entry.categoryName === "Other" ? "#c3c2b7" : categoricalColor(index) }}
                    />
                    <span className="truncate text-muted-foreground">{entry.categoryName}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {total > 0 ? Math.round((entry.amount / total) * 100) : 0}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
