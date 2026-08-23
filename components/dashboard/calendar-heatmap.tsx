import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/inr";
import { sequentialColor } from "@/lib/dashboard/colors";

export function CalendarHeatmap({
  data,
  reference,
}: {
  data: { date: string; amount: number }[];
  reference: Date;
}) {
  const amountByDay = new Map(data.map((d) => [d.date, d.amount]));
  const daysInMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(reference.getFullYear(), reference.getMonth(), 1).getDay();
  const maxAmount = Math.max(1, ...data.map((d) => d.amount));

  const cells: { day: number | null; amount: number }[] = [
    ...Array.from({ length: firstWeekday }, () => ({ day: null, amount: 0 })),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const key = `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { day, amount: amountByDay.get(key) ?? 0 };
    }),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">This month at a glance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-center text-[0.6rem] text-muted-foreground sm:text-[0.65rem]">
              {d}
            </div>
          ))}
          {cells.map((cell, i) =>
            cell.day == null ? (
              <div key={i} />
            ) : (
              <div
                key={i}
                title={cell.day ? `${cell.day}: ${formatINR(cell.amount, { showDecimals: true })}` : undefined}
                className="flex aspect-square items-center justify-center rounded text-[0.6rem] sm:text-[0.65rem]"
                style={{
                  background: cell.amount > 0 ? sequentialColor(cell.amount / maxAmount) : "var(--muted)",
                  color: cell.amount / maxAmount > 0.6 ? "#fff" : undefined,
                }}
              >
                {cell.day}
              </div>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
}
