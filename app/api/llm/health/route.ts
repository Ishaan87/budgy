import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/supabase/server";
import { listChainWithState } from "@/lib/db/queries/llm";

export async function GET() {
  const userId = await requireUserId();
  const chain = await listChainWithState(userId);
  return NextResponse.json({ chain });
}
