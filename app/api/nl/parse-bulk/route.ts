import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/supabase/server";
import { parseTransactionText } from "@/lib/nl/parseText";
import { findPotentialDuplicate } from "@/lib/db/queries/transactions";

const bodySchema = z.object({ text: z.string().trim().min(1).max(20_000) });
const MAX_LINES = 100;

export async function POST(request: Request) {
  const userId = await requireUserId();
  const { text } = bodySchema.parse(await request.json());

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_LINES);

  const results = [];
  for (const line of lines) {
    const result = await parseTransactionText(userId, line);
    const duplicate =
      result.draft.amount != null
        ? await findPotentialDuplicate(userId, result.draft.amount, new Date(result.draft.occurredAt))
        : null;
    results.push({ line, ...result, isDuplicate: !!duplicate });
  }

  return NextResponse.json({
    results,
    truncated: text.split("\n").filter((l) => l.trim()).length > MAX_LINES,
  });
}
