"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { recurringRules } from "@/lib/db/schema";
import { requireUserId } from "@/lib/supabase/server";

const recurringFormSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(["expense", "income", "transfer"]),
  amount: z.coerce.number().positive(),
  accountId: z.string().uuid(),
  toAccountId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  merchant: z.string().trim().optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.coerce.number().int().min(1).default(1),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional().nullable(),
  weekday: z.coerce.number().int().min(0).max(6).optional().nullable(),
  nextRunOn: z.coerce.date(),
  endOn: z.coerce.date().optional().nullable(),
  autoPost: z.boolean().default(true),
});
export type RecurringFormValues = z.infer<typeof recurringFormSchema>;

function toDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function createRecurringRule(input: RecurringFormValues) {
  const userId = await requireUserId();
  const data = recurringFormSchema.parse(input);

  await db.insert(recurringRules).values({
    userId,
    name: data.name,
    type: data.type,
    amount: data.amount.toFixed(2),
    accountId: data.accountId,
    toAccountId: data.type === "transfer" ? data.toAccountId : null,
    categoryId: data.type === "transfer" ? null : data.categoryId,
    merchant: data.merchant || null,
    frequency: data.frequency,
    interval: data.interval,
    dayOfMonth: data.dayOfMonth ?? null,
    weekday: data.weekday ?? null,
    nextRunOn: toDateOnly(data.nextRunOn),
    endOn: data.endOn ? toDateOnly(data.endOn) : null,
    autoPost: data.autoPost,
  });

  revalidatePath("/recurring");
}

export async function updateRecurringRule(id: string, input: RecurringFormValues) {
  const userId = await requireUserId();
  const data = recurringFormSchema.parse(input);

  await db
    .update(recurringRules)
    .set({
      name: data.name,
      type: data.type,
      amount: data.amount.toFixed(2),
      accountId: data.accountId,
      toAccountId: data.type === "transfer" ? data.toAccountId : null,
      categoryId: data.type === "transfer" ? null : data.categoryId,
      merchant: data.merchant || null,
      frequency: data.frequency,
      interval: data.interval,
      dayOfMonth: data.dayOfMonth ?? null,
      weekday: data.weekday ?? null,
      nextRunOn: toDateOnly(data.nextRunOn),
      endOn: data.endOn ? toDateOnly(data.endOn) : null,
      autoPost: data.autoPost,
      updatedAt: new Date(),
    })
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)));

  revalidatePath("/recurring");
}

export async function deleteRecurringRule(id: string) {
  const userId = await requireUserId();
  await db.delete(recurringRules).where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)));
  revalidatePath("/recurring");
}

export async function toggleRecurringActive(id: string, isActive: boolean) {
  const userId = await requireUserId();
  await db
    .update(recurringRules)
    .set({ isActive })
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, userId)));
  revalidatePath("/recurring");
}
