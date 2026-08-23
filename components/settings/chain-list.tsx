"use client";

import { useTransition } from "react";
import { ArrowUp, ArrowDown, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { PROVIDER_LABELS } from "@/lib/llm/models";
import { formatDateTimeDMY } from "@/lib/inr";
import {
  moveChainEntry,
  removeChainEntry,
  resetChainCooldown,
  toggleChainEnabled,
} from "@/app/(app)/settings/llm-actions";
import type { LlmProvider } from "@/lib/llm/types";

export type ChainRow = {
  chainId: string;
  priority: number;
  provider: LlmProvider;
  model: string;
  enabled: boolean;
  credentialLabel: string;
  keyLast4: string;
  status: "ok" | "cooldown" | "disabled" | null;
  cooldownUntil: Date | string | null;
  lastError: string | null;
  callCount: number | null;
  errorCount: number | null;
  totalTokens: number | null;
  estCostUsd: string | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  ok: "secondary",
  cooldown: "default",
  disabled: "destructive",
};

export function ChainList({ rows }: { rows: ChainRow[] }) {
  const [isPending, startTransition] = useTransition();

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No models in your chain yet. Add an API key, then add a model to start using
        natural-language entry.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div
          key={row.chainId}
          className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex flex-col shrink-0">
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={index === 0 || isPending}
                onClick={() => startTransition(() => moveChainEntry(row.chainId, "up"))}
              >
                <ArrowUp className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={index === rows.length - 1 || isPending}
                onClick={() => startTransition(() => moveChainEntry(row.chainId, "down"))}
              >
                <ArrowDown className="size-3" />
              </Button>
            </div>
            <div className="min-w-0">
              <p className="font-medium break-words">{row.model}</p>
              <p className="text-xs text-muted-foreground break-words">
                {PROVIDER_LABELS[row.provider]} · {row.credentialLabel} (···{row.keyLast4})
              </p>
              {row.status === "cooldown" && row.cooldownUntil && (
                <p className="text-xs text-amber-600">
                  Cooling down until {formatDateTimeDMY(row.cooldownUntil)}
                </p>
              )}
              {row.status === "disabled" && (
                <p className="text-xs text-destructive">Disabled — {row.lastError}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
            <div className="hidden text-right text-xs text-muted-foreground sm:block">
              <p>
                {row.callCount ?? 0} calls · {row.errorCount ?? 0} errors
              </p>
              <p>
                {row.totalTokens ?? 0} tokens · ${Number(row.estCostUsd ?? 0).toFixed(4)}
              </p>
            </div>
            {row.status && row.status !== "ok" && (
              <Button
                variant="ghost"
                size="icon-sm"
                title="Reset cooldown / re-enable"
                onClick={() =>
                  startTransition(async () => {
                    await resetChainCooldown(row.chainId);
                    toast.success("Reset");
                  })
                }
              >
                <RotateCcw className="size-3.5" />
              </Button>
            )}
            <Badge variant={STATUS_VARIANT[row.status ?? "ok"]} className="capitalize">
              {row.status ?? "ok"}
            </Badge>
            <Switch
              checked={row.enabled}
              onCheckedChange={(checked) => startTransition(() => toggleChainEnabled(row.chainId, checked))}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => startTransition(() => removeChainEntry(row.chainId))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
