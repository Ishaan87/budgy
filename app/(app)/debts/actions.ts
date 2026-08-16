"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { debtEntries, debts } from "@/lib/db/schema";
import { requireUserId } from "@/lib/supabase/server";
import { createTransaction } from "@/lib/db/queries/transactions";

const createDebtSchema = z.object({
  counterparty: z.string().trim().min(1),
  direction: z.enum(["owed_to_me", "i_owe"]),
  note: z.string().trim().optional(),
  initialAmount: z.coerce.number().positive().optional(),
});

export async function createDebt(input: z.infer<typeof createDebtSchema>) {
  const userId = await requireUserId();
  const data = createDebtSchema.parse(input);

  const [created] = await db
    .insert(debts)
    .values({ userId, counterparty: data.counterparty, direction: data.direction, note: data.note || null })
    .returning();

  if (data.initialAmount) {
    await db.insert(debtEntries).values({
      debtId: created.id,
      userId,
      type: data.direction === "owed_to_me" ? "lend" : "borrow",
      amount: data.initialAmount.toFixed(2),
      occurredAt: new Date(),
    });
  }

  revalidatePath("/debts");
}

const addEntrySchema = z.object({
  debtId: z.string().uuid(),
  type: z.enum(["lend", "borrow", "repayment"]),
  amount: z.coerce.number().positive(),
  note: z.string().trim().optional(),
  linkAccountId: z.string().uuid().optional(),
});

export async function addDebtEntry(input: z.infer<typeof addEntrySchema>) {
  const userId = await requireUserId();
  const data = addEntrySchema.parse(input);

  const [debt] = await db.select().from(debts).where(and(eq(debts.id, data.debtId), eq(debts.userId, userId)));
  if (!debt) throw new Error("Debt not found");

  let transactionId: string | null = null;
  if (data.linkAccountId) {
    // A repayment received is income; a repayment made (or a fresh loan out) is an expense.
    const isIncome = data.type === "repayment" ? debt.direction === "owed_to_me" : debt.direction === "i_owe";
    const created = await createTransaction(
      userId,
      {
        type: isIncome ? "income" : "expense",
        amount: data.amount,
        accountId: data.linkAccountId,
        toAccountId: null,
        categoryId: null,
        occurredAt: new Date(),
        merchant: debt.counterparty,
        note: data.note || `${data.type} — ${debt.counterparty}`,
        tags: [],
        splits: [],
      },
      { source: "manual" },
    );
    transactionId = created.id;
  }

  await db.insert(debtEntries).values({
    debtId: data.debtId,
    userId,
    type: data.type,
    amount: data.amount.toFixed(2),
    occurredAt: new Date(),
    note: data.note || null,
    transactionId,
  });

  revalidatePath("/debts");
  revalidatePath("/transactions");
}

export async function settleDebt(debtId: string) {
  const userId = await requireUserId();
  await db.update(debts).set({ isSettled: true }).where(and(eq(debts.id, debtId), eq(debts.userId, userId)));
  revalidatePath("/debts");
}

export async function deleteDebt(debtId: string) {
  const userId = await requireUserId();
  await db.delete(debts).where(and(eq(debts.id, debtId), eq(debts.userId, userId)));
  revalidatePath("/debts");
}
