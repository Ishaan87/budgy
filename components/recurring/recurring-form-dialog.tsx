"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
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
import { createRecurringRule, updateRecurringRule } from "@/app/(app)/recurring/actions";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  type: z.enum(["expense", "income", "transfer"]),
  amount: z.coerce.number().positive(),
  accountId: z.string().uuid("Choose an account"),
  toAccountId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.coerce.number().int().min(1),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional().nullable(),
  nextRunOn: z.coerce.date(),
  autoPost: z.boolean(),
});
type FormValues = z.output<typeof schema>;
type FormInput = z.input<typeof schema>;

type Option = { id: string; name: string };
type ExistingRule = {
  id: string;
  name: string;
  type: "expense" | "income" | "transfer";
  amount: string;
  accountId: string;
  categoryId: string | null;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  dayOfMonth: number | null;
  nextRunOn: string;
  autoPost: boolean;
};

function toDateInput(d: Date | string) {
  return new Date(d).toISOString().slice(0, 10);
}

export function RecurringFormDialog({
  accounts,
  categories,
  rule,
}: {
  accounts: Option[];
  categories: (Option & { kind: "expense" | "income" })[];
  rule?: ExistingRule;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = !!rule;

  const defaults: FormInput = {
    name: rule?.name ?? "",
    type: rule?.type ?? "expense",
    amount: rule ? Number(rule.amount) : 0,
    accountId: rule?.accountId ?? accounts[0]?.id ?? "",
    toAccountId: null,
    categoryId: rule?.categoryId ?? null,
    frequency: rule?.frequency ?? "monthly",
    interval: rule?.interval ?? 1,
    dayOfMonth: rule?.dayOfMonth ?? new Date().getDate(),
    nextRunOn: rule ? new Date(rule.nextRunOn) : new Date(),
    autoPost: rule?.autoPost ?? true,
  };

  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });
  const type = watch("type");
  const frequency = watch("frequency");
  const relevantCategories = categories.filter((c) => c.kind === (type === "income" ? "income" : "expense"));

  useEffect(() => {
    if (open) reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateRecurringRule(rule.id, values);
        toast.success("Updated");
      } else {
        await createRecurringRule(values);
        toast.success("Recurring rule created");
      }
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={isEdit ? "outline" : "default"} size={isEdit ? "sm" : "default"} />}>
        {isEdit ? "Edit" : (
          <>
            <Plus className="size-4" /> New recurring
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit recurring transaction" : "New recurring transaction"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-1">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g. Rent" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input id="amount" type="number" step="0.01" {...register("amount")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Account</Label>
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
          ) : (
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
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Controller
                control={control}
                name="frequency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interval">Every</Label>
              <Input id="interval" type="number" min={1} {...register("interval")} />
            </div>
            {(frequency === "monthly" || frequency === "yearly") && (
              <div className="space-y-2">
                <Label htmlFor="dayOfMonth">Day</Label>
                <Input id="dayOfMonth" type="number" min={1} max={31} {...register("dayOfMonth")} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextRunOn">Next run</Label>
            <Controller
              control={control}
              name="nextRunOn"
              render={({ field }) => (
                <Input
                  id="nextRunOn"
                  type="date"
                  value={toDateInput(field.value as string | Date)}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                />
              )}
            />
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
