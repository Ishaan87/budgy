"use client";

import { useTransition } from "react";
import { CheckCircle2, Trash2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateDMY, formatINR } from "@/lib/inr";
import { DebtEntryDialog } from "./debt-entry-dialog";
import { deleteDebt, settleDebt } from "@/app/(app)/debts/actions";

type Option = { id: string; name: string };

export type DebtWithBalance = {
  id: string;
  counterparty: string;
  direction: "owed_to_me" | "i_owe";
  isSettled: boolean;
  balance: number;
  entries: { id: string; type: string; amount: number; occurredAt: Date; note: string | null }[];
};

export function DebtCard({ debt, accounts }: { debt: DebtWithBalance; accounts: Option[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card className={debt.isSettled ? "opacity-60" : undefined}>
      <CardContent className="space-y-2 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-medium">{debt.counterparty}</p>
            <p className="text-lg font-semibold tabular-nums">{formatINR(debt.balance, { showDecimals: true })}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            {!debt.isSettled && (
              <DebtEntryDialog
                debtId={debt.id}
                direction={debt.direction}
                accounts={accounts}
                trigger={
                  <Button variant="outline" size="icon-sm">
                    <Plus className="size-3.5" />
                  </Button>
                }
              />
            )}
            {!debt.isSettled && debt.balance === 0 && (
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                onClick={() => startTransition(() => settleDebt(debt.id))}
                title="Mark settled"
              >
                <CheckCircle2 className="size-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={isPending}
              onClick={() => startTransition(() => deleteDebt(debt.id))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
        {debt.entries.length > 0 && (
          <div className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
            {debt.entries.slice(0, 3).map((e) => (
              <div key={e.id} className="flex flex-wrap justify-between gap-x-2">
                <span className="capitalize">{e.type}</span>
                <span className="whitespace-nowrap">
                  {formatINR(e.amount)} · {formatDateDMY(e.occurredAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
