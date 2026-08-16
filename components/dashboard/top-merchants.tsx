import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatINR } from "@/lib/inr";

export function TopMerchants({ data }: { data: { merchant: string; amount: number; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.amount));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top merchants this month</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No merchant data yet.</p>
        ) : (
          data.map((m) => (
            <div key={m.merchant} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{m.merchant}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatINR(m.amount, { showDecimals: true })} · {m.count}x
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-[#2a78d6]" style={{ width: `${(m.amount / max) * 100}%` }} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
