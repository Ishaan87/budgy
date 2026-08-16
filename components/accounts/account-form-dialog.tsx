"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
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
  ACCOUNT_TYPES,
  accountFormSchema,
  type AccountFormInput,
  type AccountFormValues,
} from "@/lib/validation/account";
import { createAccount, updateAccount } from "@/app/(app)/accounts/actions";
import type { AccountWithBalance } from "@/lib/db/queries/accounts";

const TYPE_LABELS: Record<(typeof ACCOUNT_TYPES)[number], string> = {
  cash: "Cash",
  bank: "Bank",
  wallet: "Wallet / UPI",
  credit_card: "Credit card",
  investment: "Investment",
};

export function AccountFormDialog({ account }: { account?: AccountWithBalance }) {
  const [open, setOpen] = useState(false);
  const isEdit = !!account;

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormInput, unknown, AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: account?.name ?? "",
      type: account?.type ?? "bank",
      openingBalance: account ? Number(account.openingBalance) : 0,
      creditLimit: account?.creditLimit ? Number(account.creditLimit) : undefined,
      statementDay: account?.statementDay ?? undefined,
      dueDay: account?.dueDay ?? undefined,
    },
  });

  const type = watch("type");

  useEffect(() => {
    if (open) {
      reset({
        name: account?.name ?? "",
        type: account?.type ?? "bank",
        openingBalance: account ? Number(account.openingBalance) : 0,
        creditLimit: account?.creditLimit ? Number(account.creditLimit) : undefined,
        statementDay: account?.statementDay ?? undefined,
        dueDay: account?.dueDay ?? undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: AccountFormValues) {
    try {
      if (isEdit) {
        await updateAccount(account.id, values);
        toast.success("Account updated");
      } else {
        await createAccount(values);
        toast.success("Account created");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={isEdit ? "outline" : "default"} size={isEdit ? "sm" : "default"} />
        }
      >
        {isEdit ? "Edit" : (
          <>
            <Plus className="size-4" /> Add account
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit account" : "New account"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g. HDFC Bank" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="openingBalance">Opening balance (₹)</Label>
            <Input
              id="openingBalance"
              type="number"
              step="0.01"
              {...register("openingBalance")}
            />
            {errors.openingBalance && (
              <p className="text-sm text-destructive">{errors.openingBalance.message}</p>
            )}
          </div>

          {type === "credit_card" && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="creditLimit">Limit (₹)</Label>
                <Input id="creditLimit" type="number" step="0.01" {...register("creditLimit")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statementDay">Statement day</Label>
                <Input id="statementDay" type="number" min={1} max={31} {...register("statementDay")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDay">Due (days after)</Label>
                <Input id="dueDay" type="number" min={1} max={31} {...register("dueDay")} />
              </div>
            </div>
          )}
          {errors.creditLimit && (
            <p className="text-sm text-destructive">{errors.creditLimit.message}</p>
          )}

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
