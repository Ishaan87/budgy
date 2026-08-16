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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROVIDER_LABELS } from "@/lib/llm/models";
import { addCredential } from "@/app/(app)/settings/llm-actions";

const schema = z.object({
  provider: z.enum(["openrouter", "gemini", "huggingface"]),
  label: z.string().trim().min(1, "Give it a name"),
  apiKey: z.string().trim().min(10, "That doesn't look like a valid API key"),
});
type FormValues = z.infer<typeof schema>;

const KEY_URLS: Record<FormValues["provider"], string> = {
  openrouter: "https://openrouter.ai/keys",
  gemini: "https://aistudio.google.com/apikey",
  huggingface: "https://huggingface.co/settings/tokens",
};

export function AddCredentialDialog() {
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
    defaultValues: { provider: "openrouter", label: "", apiKey: "" },
  });
  const provider = watch("provider");

  async function onSubmit(values: FormValues) {
    try {
      await addCredential(values);
      toast.success("API key added");
      reset({ provider: values.provider, label: "", apiKey: "" });
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" /> Add API key
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add an LLM API key</DialogTitle>
          <DialogDescription>
            Stored encrypted at rest. Never shown again after saving — only the last 4
            characters are displayed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Controller
              control={control}
              name="provider"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROVIDER_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Get a key at{" "}
              <a href={KEY_URLS[provider]} target="_blank" rel="noreferrer" className="underline">
                {KEY_URLS[provider]}
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input id="label" placeholder="e.g. Personal OpenRouter key" {...register("label")} />
            {errors.label && <p className="text-sm text-destructive">{errors.label.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API key</Label>
            <Input id="apiKey" type="password" autoComplete="off" {...register("apiKey")} />
            {errors.apiKey && <p className="text-sm text-destructive">{errors.apiKey.message}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
