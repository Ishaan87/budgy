import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/inr";
import { cn } from "@/lib/utils";

export function SummaryTiles({
  totalExpense,
  totalIncome,
  net,
  cashOnHand,
  projected,
}: {
  totalExpense: number;
  totalIncome: number;
  net: number;
  cashOnHand: number;
  projected: number;
}) {
  const tiles = [
    { label: "Spent this month", value: totalExpense, tone: "default" as const },
    { label: "Income this month", value: totalIncome, tone: "good" as const },
    { label: "Net", value: net, tone: net >= 0 ? ("good" as const) : ("bad" as const) },
    { label: "Cash on hand", value: cashOnHand, tone: "default" as const },
    { label: "Projected month-end spend", value: projected, tone: "default" as const },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardContent className="space-y-1 pt-4">
            <CardDescription>{tile.label}</CardDescription>
            <CardTitle
              className={cn(
                "text-xl tabular-nums",
                tile.tone === "good" && "text-emerald-600",
                tile.tone === "bad" && "text-destructive",
              )}
            >
              {formatINR(tile.value, { showDecimals: true })}
            </CardTitle>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
