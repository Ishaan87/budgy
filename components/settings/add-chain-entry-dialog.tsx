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
import { MODEL_PRESETS } from "@/lib/llm/models";
import { addChainEntry } from "@/app/(app)/settings/llm-actions";
import type { LlmProvider } from "@/lib/llm/types";

const schema = z.object({
  credentialId: z.string().uuid("Add an API key first"),
  model: z.string().trim().min(1, "Choose or type a model"),
});
type FormValues = z.infer<typeof schema>;

type Credential = { id: string; provider: LlmProvider; label: string; keyLast4: string };

export function AddChainEntryDialog({ credentials }: { credentials: Credential[] }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { credentialId: credentials[0]?.id ?? "", model: "" },
  });
  const credentialId = watch("credentialId");
  const selectedCredential = credentials.find((c) => c.id === credentialId);

  async function onSubmit(values: FormValues) {
    const credential = credentials.find((c) => c.id === values.credentialId);
    if (!credential) return;
    try {
      await addChainEntry({ credentialId: values.credentialId, provider: credential.provider, model: values.model });
      toast.success("Added to chain");
      reset({ credentialId: values.credentialId, model: "" });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (credentials.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Plus className="size-4" /> Add model to chain
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a model to the fallback chain</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>API key</Label>
            <Controller
              control={control}
              name="credentialId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {credentials.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label} (···{c.keyLast4})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              list="model-presets"
              placeholder="Pick a suggestion or type any model id"
              {...register("model")}
            />
            <datalist id="model-presets">
              {(selectedCredential ? MODEL_PRESETS[selectedCredential.provider] : []).map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            {errors.model && <p className="text-sm text-destructive">{errors.model.message}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
