"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
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
import { ruleConditionSchema } from "@/lib/rules/engine";
import { createRule, previewRule, updateRule, type RuleFormValues } from "@/app/(app)/rules/actions";

const schema = z.object({
  match: z.array(ruleConditionSchema).min(1),
  categoryId: z.string().uuid("Choose a category"),
});
type FormValues = z.infer<typeof schema>;

type Category = { id: string; name: string };
type ExistingRule = { id: string; match: RuleFormValues["match"]; set: { categoryId: string } };

const FIELD_LABELS = { merchant: "Merchant", note: "Note", accountId: "Account", text: "Full text" };
const OP_LABELS = { contains: "contains", equals: "equals", startsWith: "starts with" };

export function RuleFormDialog({ categories, rule }: { categories: Category[]; rule?: ExistingRule }) {
  const [open, setOpen] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const isEdit = !!rule;

  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      match: rule?.match ?? [{ field: "merchant", op: "contains", value: "" }],
      categoryId: rule?.set.categoryId ?? categories[0]?.id ?? "",
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "match" });
  const matchValues = watch("match");

  useEffect(() => {
    if (open) {
      reset({
        match: rule?.match ?? [{ field: "merchant", op: "contains", value: "" }],
        categoryId: rule?.set.categoryId ?? categories[0]?.id ?? "",
      });
      setPreviewCount(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const valid = matchValues.every((m) => m.value?.trim());
    if (!open || !valid) return;
    const timer = setTimeout(async () => {
      try {
        const count = await previewRule(matchValues);
        setPreviewCount(count);
      } catch {
        setPreviewCount(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [matchValues, open]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit) {
        await updateRule(rule.id, { ...values, tags: [] });
        toast.success("Rule updated");
      } else {
        await createRule({ ...values, tags: [] });
        toast.success("Rule created");
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
            <Plus className="size-4" /> New rule
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit rule" : "New auto-categorization rule"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-1">
          <div className="space-y-2">
            <Label>When</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex gap-2">
                  <Controller
                    control={control}
                    name={`match.${index}.field`}
                    render={({ field: f }) => (
                      <Select value={f.value} onValueChange={f.onChange}>
                        <SelectTrigger className="w-full sm:w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(FIELD_LABELS).map(([v, label]) => (
                            <SelectItem key={v} value={v}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <Controller
                    control={control}
                    name={`match.${index}.op`}
                    render={({ field: f }) => (
                      <Select value={f.value} onValueChange={f.onChange}>
                        <SelectTrigger className="w-full sm:w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(OP_LABELS).map(([v, label]) => (
                            <SelectItem key={v} value={v}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input placeholder="value" className="min-w-0 flex-1" {...register(`match.${index}.value` as const)} />
                  {fields.length > 1 && (
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)}>
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ field: "merchant", op: "contains", value: "" })}
            >
              <Plus className="size-3.5" /> Add condition (AND)
            </Button>
            {errors.match && <p className="text-sm text-destructive">Fill in every condition</p>}
          </div>

          <div className="space-y-2">
            <Label>Then set category to</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
          </div>

          {previewCount !== null && (
            <p className="text-xs text-muted-foreground">
              Would have matched {previewCount} of your past transactions.
            </p>
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
