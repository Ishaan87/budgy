"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TRANSACTION_TYPES,
  transactionFormSchema,
  type TransactionFormInput,
  type TransactionFormValues,
} from "@/lib/validation/transaction";
import { createTransactionAction, updateTransactionAction } from "@/app/(app)/transactions/actions";
import { sumRupees } from "@/lib/money";
import { formatINR } from "@/lib/inr";

type Option = { id: string; name: string };

function toDatetimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TransactionFormDialog({
  accounts,
  categories,
  transaction,
  trigger,
}: {
  accounts: Option[];
  categories: (Option & { kind: "expense" | "income" })[];
  transaction?: {
    id: string;
    type: (typeof TRANSACTION_TYPES)[number];
    amount: string;
    accountId: string;
    toAccountId: string | null;
    categoryId: string | null;
    occurredAt: string | Date;
    merchant: string | null;
    note: string | null;
    tags: string[];
  };
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [showSplits, setShowSplits] = useState(false);
  const isEdit = !!transaction;

  const defaultValues: TransactionFormInput = {
    type: transaction?.type ?? "expense",
    amount: transaction ? Number(transaction.amount) : 0,
    accountId: transaction?.accountId ?? accounts[0]?.id ?? "",
    toAccountId: transaction?.toAccountId ?? null,
    categoryId: transaction?.categoryId ?? null,
    occurredAt: transaction ? new Date(transaction.occurredAt) : new Date(),
    merchant: transaction?.merchant ?? "",
    note: transaction?.note ?? "",
    tags: transaction?.tags ?? [],
    splits: [],
  };

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormInput, unknown, TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "splits" });
  const type = watch("type");
  const amount = watch("amount");
  const accountId = watch("accountId");
  const splits = watch("splits");

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setShowSplits(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const relevantCategories = categories.filter((c) => c.kind === (type === "income" ? "income" : "expense"));
  const splitsTotal = (splits?.length ?? 0) > 0 ? sumRupees((splits ?? []).map((s) => Number(s.amount) || 0)) : 0;

  async function onSubmit(values: TransactionFormValues) {
    try {
      const payload = { ...values, splits: showSplits ? values.splits : [] };
      if (isEdit) {
        await updateTransactionAction(transaction.id, payload);
        toast.success("Transaction updated");
      } else {
        await createTransactionAction(payload);
        toast.success("Transaction added");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ? <span /> : <Button />}>
        {trigger ?? (
          <>
            <Plus className="size-4" /> Add transaction
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit transaction" : "New transaction"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-1">
          <div className="space-y-2">
            <Label>Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-2">
                  {TRANSACTION_TYPES.map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={field.value === t ? "default" : "outline"}
                      className="capitalize"
                      onClick={() => field.onChange(t)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input id="amount" type="number" step="0.01" {...register("amount")} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="occurredAt">Date &amp; time</Label>
              <Controller
                control={control}
                name="occurredAt"
                render={({ field }) => (
                  <Input
                    id="occurredAt"
                    type="datetime-local"
                    value={toDatetimeLocal(new Date(field.value as string | number | Date))}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{type === "transfer" ? "From account" : "Account"}</Label>
            <Controller
              control={control}
              name="accountId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {type === "transfer" ? (
            <div className="space-y-2">
              <Label>To account</Label>
              <Controller
                control={control}
                name="toAccountId"
                render={({ field }) => (
                  <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((a) => a.id !== accountId)
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.toAccountId && (
                <p className="text-sm text-destructive">{errors.toAccountId.message}</p>
              )}
            </div>
          ) : (
            <>
              {!showSplits && (
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Controller
                    control={control}
                    name="categoryId"
                    render={({ field }) => (
                      <Select value={field.value ?? undefined} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose category" />
                        </SelectTrigger>
                        <SelectContent>
                          {relevantCategories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.categoryId && (
                    <p className="text-sm text-destructive">{errors.categoryId.message}</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() => {
                    setShowSplits((s) => !s);
                    if (!showSplits && fields.length === 0) {
                      append({ categoryId: null, amount: amount || 0, note: "" });
                    }
                  }}
                >
                  {showSplits ? "Remove split" : "Split across categories"}
                </Button>
              </div>

              {showSplits && (
                <div className="space-y-2 rounded-lg border p-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Controller
                        control={control}
                        name={`splits.${index}.categoryId`}
                        render={({ field: catField }) => (
                          <Select value={catField.value ?? undefined} onValueChange={catField.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {relevantCategories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        className="w-28"
                        {...register(`splits.${index}.amount` as const)}
                      />
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ categoryId: null, amount: 0, note: "" })}
                  >
                    <Plus className="size-3.5" /> Add split
                  </Button>
                  <p
                    className={`text-xs ${splitsTotal === Number(amount) ? "text-muted-foreground" : "text-destructive"}`}
                  >
                    Splits total {formatINR(splitsTotal, { showDecimals: true })} of{" "}
                    {formatINR(Number(amount) || 0, { showDecimals: true })}
                  </p>
                  {errors.splits && (
                    <p className="text-sm text-destructive">{errors.splits.message as string}</p>
                  )}
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="merchant">Merchant (optional)</Label>
              <Input id="merchant" placeholder="e.g. Zomato" {...register("merchant")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Input id="note" {...register("note")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
