"use client";

import { useTransition } from "react";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RuleFormDialog } from "./rule-form-dialog";
import { deleteRule, moveRule, toggleRuleActive } from "@/app/(app)/rules/actions";
import type { RuleCondition } from "@/lib/rules/engine";

const OP_SYMBOLS: Record<string, string> = { contains: "contains", equals: "is", startsWith: "starts with" };

export type RuleRow = {
  id: string;
  priority: number;
  isActive: boolean;
  match: RuleCondition[];
  set: { categoryId: string; tags?: string[] };
  hitCount: number;
  createdFrom: string;
  categoryName: string;
};

export function RuleList({ rows, categories }: { rows: RuleRow[]; categories: { id: string; name: string }[] }) {
  const [isPending, startTransition] = useTransition();

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No rules yet. Rules auto-categorize natural-language entries and speed up bulk import —
        try creating one for a merchant you spend at often.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((rule, index) => (
        <div key={rule.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={index === 0 || isPending}
                onClick={() => startTransition(() => moveRule(rule.id, "up"))}
              >
                <ArrowUp className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={index === rows.length - 1 || isPending}
                onClick={() => startTransition(() => moveRule(rule.id, "down"))}
              >
                <ArrowDown className="size-3" />
              </Button>
            </div>
            <div>
              <p className="text-sm">
                {rule.match.map((c, i) => (
                  <span key={i}>
                    {i > 0 && " and "}
                    <span className="font-medium capitalize">{c.field}</span> {OP_SYMBOLS[c.op]} &quot;{c.value}&quot;
                  </span>
                ))}
                {" → "}
                <span className="font-medium">{rule.categoryName}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {rule.hitCount} match{rule.hitCount === 1 ? "" : "es"}
                {rule.createdFrom === "learned" && " · learned from a correction"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {rule.createdFrom === "learned" && (
              <Badge variant="outline" className="text-[0.65rem]">
                learned
              </Badge>
            )}
            <Switch
              checked={rule.isActive}
              onCheckedChange={(checked) => startTransition(() => toggleRuleActive(rule.id, checked))}
            />
            <RuleFormDialog categories={categories} rule={rule} />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => startTransition(() => deleteRule(rule.id))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
