"use client";

import { useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TransactionFormDialog } from "./transaction-form-dialog";
import { deleteTransactionAction, undoDeleteTransactionAction } from "@/app/(app)/transactions/actions";

type Option = { id: string; name: string };

export function TransactionRowActions({
  transaction,
  accounts,
  categories,
}: {
  transaction: {
    id: string;
    type: "expense" | "income" | "transfer";
    amount: string;
    accountId: string;
    toAccountId: string | null;
    categoryId: string | null;
    occurredAt: string;
    merchant: string | null;
    note: string | null;
    tags: string[];
  };
  accounts: Option[];
  categories: (Option & { kind: "expense" | "income" })[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex justify-end gap-1">
      <TransactionFormDialog
        accounts={accounts}
        categories={categories}
        transaction={transaction}
        trigger={
          <Button variant="ghost" size="icon-sm">
            <Pencil className="size-3.5" />
          </Button>
        }
      />
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await deleteTransactionAction(transaction.id);
            toast("Transaction deleted", {
              action: {
                label: "Undo",
                onClick: () => undoDeleteTransactionAction(transaction.id),
              },
            });
          })
        }
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
