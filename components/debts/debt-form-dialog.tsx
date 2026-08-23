"use client";

import { useState } from "react";
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
import { createDebt } from "@/app/(app)/debts/actions";

const schema = z.object({
  counterparty: z.string().trim().min(1, "Who is this with?"),
  direction: z.enum(["owed_to_me", "i_owe"]),
  initialAmount: z.coerce.number().nonnegative().optional(),
});
type FormValues = z.output<typeof schema>;
type FormInput = z.input<typeof schema>;

export function DebtFormDialog() {
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<
    FormInput,
    unknown,
    FormValues
  >({
    resolver: zodResolver(schema),
    defaultValues: { counterparty: "", direction: "owed_to_me", initialAmount: undefined },
  });

  async function onSubmit(values: FormValues) {
    try {
      await createDebt(values);
      toast.success("Added");
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" /> New IOU
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New IOU</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="counterparty">Who</Label>
            <Input id="counterparty" placeholder="e.g. Raj" {...register("counterparty")} />
            {errors.counterparty && <p className="text-sm text-destructive">{errors.counterparty.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Direction</Label>
            <Controller
              control={control}
              name="direction"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owed_to_me">They owe me</SelectItem>
                    <SelectItem value="i_owe">I owe them</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="initialAmount">Starting amount (₹, optional)</Label>
            <Input id="initialAmount" type="number" step="0.01" {...register("initialAmount")} />
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
