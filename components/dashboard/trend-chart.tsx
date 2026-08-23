"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/inr";
import { CATEGORICAL_COLORS, CHART_INK } from "@/lib/dashboard/colors";

export function TrendChart({ data }: { data: { date: string; amount: number }[] }) {
  const chartData = data.map((d) => ({ ...d, day: Number(d.date.slice(-2)) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Daily spend this month</CardTitle>
      </CardHeader>
      <CardContent className="h-[220px] w-full sm:h-[280px] lg:h-[340px]">
        {chartData.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No expenses recorded yet this month.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART_INK.gridline} />
              <XAxis
                dataKey="day"
                tick={{ fill: CHART_INK.muted, fontSize: 11 }}
                axisLine={{ stroke: CHART_INK.baseline }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: CHART_INK.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={(v) => formatINR(v)}
              />
              <Tooltip
                formatter={(value) => formatINR(Number(value), { showDecimals: true })}
                labelFormatter={(day) => `Day ${day}`}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke={CATEGORICAL_COLORS[0]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
