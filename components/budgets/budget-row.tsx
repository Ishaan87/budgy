"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { formatINR } from "@/lib/inr";
import { upsertBudget } from "@/app/(app)/budgets/actions";
import type { BudgetRow as BudgetRowType } from "@/lib/db/queries/budgets";

export function BudgetRow({ row, month }: { row: BudgetRowType; month: Date }) {
  const [amount, setAmount] = useState(row.amount);
  const [rollover, setRollover] = useState(row.rollover);
  const [isPending, startTransition] = useTransition();

  const effectiveBudget = amount + row.rolloverFromPrevious;
  const pct = effectiveBudget > 0 ? Math.min(100, Math.round((row.spent / effectiveBudget) * 100)) : 0;
  const overBudget = effectiveBudget > 0 && row.spent > effectiveBudget;

  function save(nextAmount: number, nextRollover: boolean) {
    startTransition(async () => {
      try {
        await upsertBudget({ categoryId: row.categoryId, amount: nextAmount, effectiveFrom: month, rollover: nextRollover });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save budget");
      }
    });
  }

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-medium">{row.categoryName}</span>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Switch
              checked={rollover}
              onCheckedChange={(checked) => {
                setRollover(checked);
                save(amount, checked);
              }}
            />
            Rollover
          </label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">₹</span>
            <Input
              type="number"
              className="w-24 sm:w-24"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              onBlur={() => save(amount, rollover)}
              disabled={isPending}
            />
          </div>
        </div>
      </div>
      {effectiveBudget > 0 && (
        <>
          <Progress
            value={pct}
            className={overBudget ? "w-full [&_[data-slot=progress-indicator]]:bg-destructive" : "w-full"}
          />
          <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              {formatINR(row.spent, { showDecimals: true })} of {formatINR(effectiveBudget, { showDecimals: true })}
              {row.rolloverFromPrevious > 0 && ` (incl. ${formatINR(row.rolloverFromPrevious)} rolled over)`}
            </span>
            <span className={overBudget ? "text-destructive" : undefined}>{pct}%</span>
          </div>
        </>
      )}
    </div>
  );
}
