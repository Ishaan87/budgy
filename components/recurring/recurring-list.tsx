"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { formatDateDMY, formatINR } from "@/lib/inr";
import { RecurringFormDialog } from "./recurring-form-dialog";
import { deleteRecurringRule, toggleRecurringActive } from "@/app/(app)/recurring/actions";

type Option = { id: string; name: string };

export type RecurringRow = {
  id: string;
  name: string;
  type: "expense" | "income" | "transfer";
  amount: string;
  accountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  dayOfMonth: number | null;
  weekday: number | null;
  nextRunOn: string;
  endOn: string | null;
  autoPost: boolean;
  isActive: boolean;
};

export function RecurringList({
  rows,
  accounts,
  categories,
}: {
  rows: RecurringRow[];
  accounts: Option[];
  categories: (Option & { kind: "expense" | "income" })[];
}) {
  const [isPending, startTransition] = useTransition();

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No recurring transactions yet — add rent, subscriptions, or salary to have them post
        automatically.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((rule) => (
        <div key={rule.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <p className="font-medium">{rule.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatINR(Number(rule.amount), { showDecimals: true })} · {rule.accountName}
              {rule.categoryName && ` · ${rule.categoryName}`} · every {rule.interval > 1 ? `${rule.interval} ` : ""}
              {rule.frequency}
              {" · next "}
              {formatDateDMY(rule.nextRunOn)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!rule.autoPost && (
              <Badge variant="outline" className="text-[0.65rem]">
                manual
              </Badge>
            )}
            <Switch
              checked={rule.isActive}
              disabled={isPending}
              onCheckedChange={(checked) => startTransition(() => toggleRecurringActive(rule.id, checked))}
            />
            <RecurringFormDialog accounts={accounts} categories={categories} rule={rule} />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => startTransition(() => deleteRecurringRule(rule.id))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
