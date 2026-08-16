"use client";

import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateDMY, formatINR } from "@/lib/inr";
import type { NlDraft } from "@/lib/nl/schemas";
import { createBulkNlTransactionAction } from "@/app/(app)/transactions/actions";

type Option = { id: string; name: string };

type BulkRow = {
  line: string;
  draft: NlDraft;
  cached: boolean;
  llmUnavailable: boolean;
  isDuplicate: boolean;
  include: boolean;
};

export function BulkImportClient({
  accounts,
  categories,
}: {
  accounts: Option[];
  categories: (Option & { kind: "expense" | "income" })[];
}) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<BulkRow[] | null>(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const router = useRouter();

  async function handleParse() {
    if (!text.trim()) return;
    setParsing(true);
    try {
      const res = await fetch("/api/nl/parse-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Could not parse that");
      const data = await res.json();
      setRows(
        data.results.map((r: Omit<BulkRow, "include">) => ({ ...r, include: !r.isDuplicate && r.draft.amount != null })),
      );
      if (data.truncated) {
        toast.warning("Only the first 100 lines were parsed.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setParsing(false);
    }
  }

  function updateRow(index: number, patch: Partial<BulkRow["draft"]>) {
    setRows((prev) => prev?.map((r, i) => (i === index ? { ...r, draft: { ...r.draft, ...patch } } : r)) ?? null);
  }

  async function handleCommit() {
    if (!rows) return;
    const toCommit = rows.filter((r) => r.include);
    if (toCommit.length === 0) return;

    setCommitting(true);
    let succeeded = 0;
    for (const row of toCommit) {
      if (row.draft.amount == null || !row.draft.accountId) continue;
      if (row.draft.type !== "transfer" && !row.draft.categoryId) continue;
      if (row.draft.type === "transfer" && !row.draft.toAccountId) continue;
      try {
        await createBulkNlTransactionAction(
          row.line,
          {
            type: row.draft.type,
            amount: row.draft.amount,
            accountId: row.draft.accountId,
            toAccountId: row.draft.toAccountId,
            categoryId: row.draft.categoryId,
            occurredAt: new Date(row.draft.occurredAt),
            merchant: row.draft.merchant ?? undefined,
            note: row.draft.note ?? undefined,
            tags: row.draft.tags,
            splits: [],
          },
          { modelUsed: row.draft.modelUsed, confidence: row.draft.confidence },
        );
        succeeded += 1;
      } catch {
        // Continue committing the rest; report the shortfall below.
      }
    }
    setCommitting(false);
    toast.success(`Added ${succeeded} of ${toCommit.length} transactions`);
    setRows(null);
    setText("");
    router.push("/transactions");
    router.refresh();
  }

  const relevantCategories = (kind: "expense" | "income") => categories.filter((c) => c.kind === kind);

  if (!rows) {
    return (
      <div className="space-y-3">
        <Textarea
          rows={10}
          placeholder={"Paste a day's spending, one per line:\n50rs momos\n1200 electricity from hdfc\ngot 2000 salary"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button onClick={handleParse} disabled={parsing || !text.trim()}>
          {parsing ? <Loader2 className="size-4 animate-spin" /> : "Parse lines"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Line</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index} className={row.isDuplicate ? "bg-amber-50 dark:bg-amber-950/20" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={row.include}
                    onCheckedChange={(checked) =>
                      setRows((prev) => prev?.map((r, i) => (i === index ? { ...r, include: !!checked } : r)) ?? null)
                    }
                  />
                </TableCell>
                <TableCell className="max-w-40 truncate text-sm" title={row.line}>
                  {row.line}
                  {row.isDuplicate && (
                    <span className="ml-1 inline-flex items-center gap-1 text-xs text-amber-700">
                      <TriangleAlert className="size-3" /> possible duplicate
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Select value={row.draft.type} onValueChange={(v) => updateRow(index, { type: v as NlDraft["type"] })}>
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="w-28">
                  <input
                    className="w-24 rounded border bg-transparent px-2 py-1 text-sm"
                    type="number"
                    value={row.draft.amount ?? ""}
                    onChange={(e) => updateRow(index, { amount: Number(e.target.value) || null })}
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={row.draft.accountId ?? undefined}
                    onValueChange={(v) => updateRow(index, { accountId: v })}
                  >
                    <SelectTrigger size="sm">
                      <SelectValue placeholder="Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {row.draft.type === "transfer" ? (
                    <Select
                      value={row.draft.toAccountId ?? undefined}
                      onValueChange={(v) => updateRow(index, { toAccountId: v })}
                    >
                      <SelectTrigger size="sm">
                        <SelectValue placeholder="To account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select
                      value={row.draft.categoryId ?? undefined}
                      onValueChange={(v) => updateRow(index, { categoryId: v })}
                    >
                      <SelectTrigger size="sm">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {relevantCategories(row.draft.type === "income" ? "income" : "expense").map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDateDMY(row.draft.occurredAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {rows.filter((r) => r.include).length} of {rows.length} selected ·{" "}
          {formatINR(
            rows.filter((r) => r.include).reduce((sum, r) => sum + (r.draft.amount ?? 0), 0),
            { showDecimals: true },
          )}{" "}
          total
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRows(null)}>
            Start over
          </Button>
          <Button onClick={handleCommit} disabled={committing}>
            {committing ? "Adding…" : `Add ${rows.filter((r) => r.include).length} transactions`}
          </Button>
        </div>
      </div>
    </div>
  );
}
