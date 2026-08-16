"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { listQueuedTransactions, removeQueuedTransaction } from "@/lib/offline/queue";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";
import { createNlTransactionAction } from "@/app/(app)/transactions/actions";

export function OfflineSync() {
  const [queuedCount, setQueuedCount] = useState(0);
  const isOnline = useOnlineStatus();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function refreshCount() {
      const items = await listQueuedTransactions();
      if (!cancelled) setQueuedCount(items.length);
    }

    async function flush() {
      const items = await listQueuedTransactions();
      if (items.length === 0) return;
      let synced = 0;
      for (const item of items) {
        try {
          await createNlTransactionAction(
            item.rawInput,
            {
              type: item.payload.type,
              amount: item.payload.amount,
              accountId: item.payload.accountId,
              toAccountId: item.payload.toAccountId,
              categoryId: item.payload.categoryId,
              occurredAt: new Date(item.payload.occurredAt),
              merchant: item.payload.merchant,
              note: item.payload.note,
              tags: item.payload.tags,
              splits: [],
            },
            { modelUsed: item.modelUsed, confidence: item.confidence },
          );
          await removeQueuedTransaction(item.id);
          synced += 1;
        } catch {
          // Still offline or the server rejected it — leave it queued and retry next time.
          break;
        }
      }
      if (synced > 0) {
        toast.success(`Synced ${synced} offline entr${synced === 1 ? "y" : "ies"}`);
        router.refresh();
      }
      await refreshCount();
    }

    refreshCount();
    if (isOnline) flush();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  if (isOnline && queuedCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
      <WifiOff className="size-3" />
      {!isOnline ? "Offline" : `Syncing ${queuedCount}…`}
      {queuedCount > 0 && !isOnline && ` · ${queuedCount} queued`}
    </div>
  );
}
