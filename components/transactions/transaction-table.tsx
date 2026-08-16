import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeDMY, formatINR } from "@/lib/inr";
import { TransactionRowActions } from "./transaction-row-actions";

type Option = { id: string; name: string };

type Row = {
  id: string;
  type: "expense" | "income" | "transfer";
  amount: string;
  occurredAt: Date | string;
  merchant: string | null;
  note: string | null;
  tags: string[];
  source: string;
  accountId: string;
  accountName: string | null;
  toAccountId: string | null;
  categoryId: string | null;
  categoryName: string | null;
};

const TYPE_ICON = {
  expense: <ArrowUpRight className="size-4 text-destructive" />,
  income: <ArrowDownLeft className="size-4 text-emerald-600" />,
  transfer: <ArrowLeftRight className="size-4 text-muted-foreground" />,
};

export function TransactionTable({
  rows,
  accounts,
  categories,
}: {
  rows: Row[];
  accounts: Option[];
  categories: (Option & { kind: "expense" | "income" })[];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No transactions match these filters yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Merchant / Note</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{TYPE_ICON[r.type]}</TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDateTimeDMY(r.occurredAt)}
              </TableCell>
              <TableCell>
                <div className="font-medium">{r.merchant || r.note || "—"}</div>
                {r.merchant && r.note && (
                  <div className="text-xs text-muted-foreground">{r.note}</div>
                )}
                {r.tags.length > 0 && (
                  <div className="mt-1 flex gap-1">
                    {r.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[0.65rem]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {r.accountName}
                {r.type === "transfer" && r.toAccountId && (
                  <span className="text-muted-foreground">
                    {" "}
                    → {accounts.find((a) => a.id === r.toAccountId)?.name}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {r.categoryName ?? (r.type === "transfer" ? "Transfer" : "—")}
              </TableCell>
              <TableCell
                className={`text-right tabular-nums font-medium ${
                  r.type === "expense" ? "text-destructive" : r.type === "income" ? "text-emerald-600" : ""
                }`}
              >
                {r.type === "expense" ? "-" : r.type === "income" ? "+" : ""}
                {formatINR(Number(r.amount), { showDecimals: true })}
              </TableCell>
              <TableCell>
                <TransactionRowActions
                  transaction={{
                    id: r.id,
                    type: r.type,
                    amount: r.amount,
                    accountId: r.accountId,
                    toAccountId: r.toAccountId,
                    categoryId: r.categoryId,
                    occurredAt: new Date(r.occurredAt).toISOString(),
                    merchant: r.merchant,
                    note: r.note,
                    tags: r.tags,
                  }}
                  accounts={accounts}
                  categories={categories}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
