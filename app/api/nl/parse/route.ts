import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/supabase/server";
import { parseTransactionText } from "@/lib/nl/parseText";

const bodySchema = z.object({ text: z.string().trim().min(1).max(500) });

export async function POST(request: Request) {
  const userId = await requireUserId();
  const { text } = bodySchema.parse(await request.json());
  const result = await parseTransactionText(userId, text);
  return NextResponse.json(result);
}
