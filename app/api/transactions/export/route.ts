import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/server";
import { listTransactions } from "@/lib/db/queries/transactions";
import { transactionFiltersSchema } from "@/lib/validation/transaction";
import { formatDateTimeDMY } from "@/lib/inr";

function toCsvValue(value: unknown): string {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export async function GET(request: Request) {
  const userId = await requireUserId();
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "json" ? "json" : "csv";

  const filters = transactionFiltersSchema.parse({
    accountId: searchParams.get("accountId") ?? undefined,
    categoryId: searchParams.get("categoryId") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page: 1,
    pageSize: 200,
  });

  // Export ignores pagination — walk every page for the given filters.
  const all: Awaited<ReturnType<typeof listTransactions>>["rows"] = [];
  let page = 1;
  while (true) {
    const { rows, total } = await listTransactions(userId, { ...filters, page, pageSize: 200 });
    all.push(...rows);
    if (all.length >= total || rows.length === 0) break;
    page += 1;
  }

  if (format === "json") {
    return NextResponse.json(all, {
      headers: { "Content-Disposition": 'attachment; filename="budgy-transactions.json"' },
    });
  }

  const header = ["Date", "Type", "Amount", "Account", "To Account", "Category", "Merchant", "Note", "Tags"];
  const lines = [header.join(",")];
  for (const r of all) {
    lines.push(
      [
        formatDateTimeDMY(r.occurredAt),
        r.type,
        r.amount,
        r.accountName ?? "",
        r.type === "transfer" ? (r.toAccountId ?? "") : "",
        r.categoryName ?? "",
        r.merchant ?? "",
        r.note ?? "",
        r.tags.join("; "),
      ]
        .map(toCsvValue)
        .join(","),
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="budgy-transactions.csv"',
    },
  });
}
