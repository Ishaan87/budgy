import { listCardCycles } from "@/lib/db/queries/cards";
import { requireUserId } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDateDMY, formatINR } from "@/lib/inr";

export default async function CardsPage() {
  const userId = await requireUserId();
  const cards = await listCardCycles(userId);
  const now = new Date().getTime();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cards</h1>
        <p className="text-muted-foreground">
          Billed vs unbilled spend per statement cycle. Add a credit card from the Accounts page.
        </p>
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No credit cards yet — add one from Accounts (type: Credit card) with a limit,
          statement day, and due day to see cycles here.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {cards.map((card) => {
            const total = card.billedAmount + card.unbilledAmount;
            const utilization = card.creditLimit ? Math.min(100, Math.round((total / card.creditLimit) * 100)) : 0;
            const dueInDays = Math.ceil((new Date(card.nextDueDate).getTime() - now) / (1000 * 60 * 60 * 24));

            return (
              <Card key={card.accountId}>
                <CardHeader>
                  <CardTitle className="text-base">{card.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Billed</span>
                    <span className="font-medium tabular-nums">
                      {formatINR(card.billedAmount, { showDecimals: true })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Unbilled</span>
                    <span className="font-medium tabular-nums">
                      {formatINR(card.unbilledAmount, { showDecimals: true })}
                    </span>
                  </div>
                  {card.creditLimit && (
                    <>
                      <Progress
                        value={utilization}
                        className={utilization > 80 ? "[&_[data-slot=progress-indicator]]:bg-destructive" : undefined}
                      />
                      <p className="text-xs text-muted-foreground">
                        {utilization}% of {formatINR(card.creditLimit)} limit
                      </p>
                    </>
                  )}
                  <p
                    className={`text-xs ${dueInDays <= 3 ? "font-medium text-destructive" : "text-muted-foreground"}`}
                  >
                    Due {formatDateDMY(card.nextDueDate)} ({dueInDays <= 0 ? "overdue" : `in ${dueInDays}d`})
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
