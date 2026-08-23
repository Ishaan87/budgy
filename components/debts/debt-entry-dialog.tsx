"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { addDebtEntry } from "@/app/(app)/debts/actions";

const schema = z.object({
  type: z.enum(["lend", "borrow", "repayment"]),
  amount: z.coerce.number().positive(),
  linkAccountId: z.string().uuid().optional(),
});
type FormValues = z.output<typeof schema>;
type FormInput = z.input<typeof schema>;

type Option = { id: string; name: string };

export function DebtEntryDialog({
  debtId,
  direction,
  accounts,
  trigger,
}: {
  debtId: string;
  direction: "owed_to_me" | "i_owe";
  accounts: Option[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const defaultType = direction === "owed_to_me" ? "repayment" : "repayment";
  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm<
    FormInput,
    unknown,
    FormValues
  >({
    resolver: zodResolver(schema),
    defaultValues: { type: defaultType, amount: undefined, linkAccountId: undefined },
  });
  const type = watch("type");

  async function onSubmit(values: FormValues) {
    try {
      await addDebtEntry({ debtId, ...values });
      toast.success("Recorded");
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const typeOptions =
    direction === "owed_to_me"
      ? [
          { value: "lend", label: "Lent more" },
          { value: "repayment", label: "They repaid me" },
        ]
      : [
          { value: "borrow", label: "Borrowed more" },
          { value: "repayment", label: "I repaid them" },
        ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record activity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>What happened</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input id="amount" type="number" step="0.01" {...register("amount")} />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Post as a transaction (optional)</Label>
            <Controller
              control={control}
              name="linkAccountId"
              render={({ field }) => (
                <Select value={field.value ?? "none"} onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Don't post a transaction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Don&apos;t post a transaction</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              {type === "repayment"
                ? "Recorded as income/expense on the chosen account."
                : "Recorded as an expense (money handed over) on the chosen account."}
            </p>
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
