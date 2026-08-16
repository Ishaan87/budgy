"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { budgets } from "@/lib/db/schema";
import { requireUserId } from "@/lib/supabase/server";

const upsertSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.coerce.number().nonnegative(),
  effectiveFrom: z.coerce.date(),
  rollover: z.boolean().default(false),
});

export async function upsertBudget(input: z.infer<typeof upsertSchema>) {
  const userId = await requireUserId();
  const data = upsertSchema.parse(input);
  const effectiveFrom = new Date(data.effectiveFrom.getFullYear(), data.effectiveFrom.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  if (data.amount === 0) {
    await db
      .delete(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.categoryId, data.categoryId),
          eq(budgets.effectiveFrom, effectiveFrom),
        ),
      );
    revalidatePath("/budgets");
    return;
  }

  await db
    .insert(budgets)
    .values({
      userId,
      categoryId: data.categoryId,
      amount: data.amount.toFixed(2),
      effectiveFrom,
      rollover: data.rollover,
    })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.categoryId, budgets.effectiveFrom],
      set: { amount: data.amount.toFixed(2), rollover: data.rollover, updatedAt: new Date() },
    });

  revalidatePath("/budgets");
}
