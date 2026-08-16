"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateDMY, formatINR } from "@/lib/inr";
import type { NlDraft } from "@/lib/nl/schemas";
import { createNlTransactionAction } from "@/app/(app)/transactions/actions";
import { createLearnedMerchantRule } from "@/app/(app)/rules/actions";
import { FieldSourceBadge } from "./field-source-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { accountsToAliases, fastParse } from "@/lib/nl/fastParse";
import { enqueueTransaction } from "@/lib/offline/queue";

type Option = { id: string; name: string };

export function QuickAddDialog({
  accounts,
  categories,
}: {
  accounts: Option[];
  categories: (Option & { kind: "expense" | "income" })[];
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<NlDraft | null>(null);
  const [llmUnavailable, setLlmUnavailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rememberRule, setRememberRule] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setText("");
      setDraft(null);
      setLlmUnavailable(false);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handleOpenChange(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  async function handleParse(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);

    if (!navigator.onLine) {
      // No network at all — parse locally with the deterministic pass only (no rules/LLM
      // available client-side) so entry still works in airplane mode; queued on confirm.
      const { draft: offlineDraft } = fastParse({
        text,
        accounts,
        aliases: accountsToAliases(accounts),
        rules: [],
      });
      setDraft(offlineDraft);
      setLlmUnavailable(true);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/nl/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Could not parse that");
      const data = await res.json();
      setDraft(data.draft);
      setLlmUnavailable(data.llmUnavailable);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!draft || draft.amount == null || !draft.accountId) {
      toast.error("Fill in the amount and account first");
      return;
    }
    if (draft.type !== "transfer" && !draft.categoryId) {
      toast.error("Choose a category first");
      return;
    }
    if (draft.type === "transfer" && !draft.toAccountId) {
      toast.error("Choose a destination account first");
      return;
    }

    setSaving(true);

    const payload = {
      type: draft.type,
      amount: draft.amount,
      accountId: draft.accountId,
      toAccountId: draft.toAccountId,
      categoryId: draft.categoryId,
      occurredAt: draft.occurredAt,
      merchant: draft.merchant ?? undefined,
      note: draft.note ?? undefined,
      tags: draft.tags,
    };

    if (!navigator.onLine) {
      await enqueueTransaction({
        id: crypto.randomUUID(),
        rawInput: text,
        payload,
        modelUsed: draft.modelUsed,
        confidence: draft.confidence,
        queuedAt: new Date().toISOString(),
      });
      toast.success("Saved offline — will sync when you're back online");
      setOpen(false);
      setSaving(false);
      return;
    }

    try {
      await createNlTransactionAction(
        text,
        { ...payload, occurredAt: new Date(draft.occurredAt), splits: [] },
        { modelUsed: draft.modelUsed, confidence: draft.confidence },
      );
      if (showLearnOption && rememberRule && draft.merchant && draft.categoryId) {
        await createLearnedMerchantRule(draft.merchant, draft.categoryId);
      }
      toast.success("Transaction added");
      setOpen(false);
      router.refresh();
    } catch (err) {
      // A mid-flight network drop lands here too — queue it rather than losing the entry.
      if (!navigator.onLine) {
        await enqueueTransaction({
          id: crypto.randomUUID(),
          rawInput: text,
          payload,
          modelUsed: draft.modelUsed,
          confidence: draft.confidence,
          queuedAt: new Date().toISOString(),
        });
        toast.success("Saved offline — will sync when you're back online");
        setOpen(false);
      } else {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      setSaving(false);
    }
  }

  const relevantCategories = categories.filter((c) => c.kind === (draft?.type === "income" ? "income" : "expense"));
  const showLearnOption =
    !!draft &&
    draft.type !== "transfer" &&
    !!draft.merchant &&
    !!draft.categoryId &&
    draft.sources.categoryId !== "rule";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Sparkles className="size-3.5" /> Quick add
        <kbd className="ml-1 hidden rounded border px-1 text-[0.65rem] text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4" /> Quick add
          </DialogTitle>
        </DialogHeader>

        {!draft ? (
          <form onSubmit={handleParse} className="space-y-3">
            <Input
              ref={inputRef}
              placeholder='Try "50rs spent on momos" or "got 2000 salary"'
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !text.trim()} className="w-full">
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Parse"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {llmUnavailable && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                All AI models are currently unavailable — here&apos;s what we could figure out
                automatically. Fill in the rest.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-xs">
                  Amount (₹) <FieldSourceBadge source={draft.sources.amount} />
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.amount ?? ""}
                  onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) || null })}
                />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-xs">
                  Date <FieldSourceBadge source={draft.sources.occurredAt} />
                </Label>
                <Input value={formatDateDMY(draft.occurredAt)} disabled />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["expense", "income", "transfer"] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant={draft.type === t ? "default" : "outline"}
                    className="capitalize"
                    onClick={() => setDraft({ ...draft, type: t })}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-xs">
                {draft.type === "transfer" ? "From account" : "Account"}{" "}
                <FieldSourceBadge source={draft.sources.accountId} />
              </Label>
              <Select value={draft.accountId ?? undefined} onValueChange={(v) => setDraft({ ...draft, accountId: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {draft.type === "transfer" ? (
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-xs">
                  To account <FieldSourceBadge source={draft.sources.toAccountId} />
                </Label>
                <Select
                  value={draft.toAccountId ?? undefined}
                  onValueChange={(v) => setDraft({ ...draft, toAccountId: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter((a) => a.id !== draft.accountId)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="flex items-center gap-1.5 text-xs">
                  Category <FieldSourceBadge source={draft.sources.categoryId} />
                </Label>
                <Select
                  value={draft.categoryId ?? undefined}
                  onValueChange={(v) => setDraft({ ...draft, categoryId: v })}
                >
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
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Merchant / note</Label>
              <Input
                value={draft.merchant ?? ""}
                onChange={(e) => setDraft({ ...draft, merchant: e.target.value })}
                placeholder="Optional"
              />
            </div>

            {draft.modelUsed && (
              <p className="text-xs text-muted-foreground">
                Filled in by {draft.modelUsed} · confidence {Math.round(draft.confidence * 100)}%
              </p>
            )}

            {showLearnOption && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={rememberRule} onCheckedChange={(c) => setRememberRule(!!c)} />
                Remember: &quot;{draft.merchant}&quot; always goes to{" "}
                {relevantCategories.find((c) => c.id === draft.categoryId)?.name}
              </label>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDraft(null)} className="flex-1">
                Back
              </Button>
              <Button onClick={handleConfirm} disabled={saving} className="flex-1">
                {saving ? "Saving…" : `Add ${draft.amount != null ? formatINR(draft.amount, { showDecimals: true }) : ""}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
