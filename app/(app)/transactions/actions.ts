"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/supabase/server";
import {
  createTransaction,
  softDeleteTransaction,
  restoreTransaction,
  updateTransaction,
} from "@/lib/db/queries/transactions";
import { transactionFormSchema, type TransactionFormValues } from "@/lib/validation/transaction";

export async function createTransactionAction(input: TransactionFormValues) {
  const userId = await requireUserId();
  const data = transactionFormSchema.parse(input);
  const created = await createTransaction(userId, data);
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/");
  return created;
}

export async function createNlTransactionAction(
  rawInput: string,
  input: TransactionFormValues,
  meta: { modelUsed: string | null; confidence: number },
) {
  const userId = await requireUserId();
  const data = transactionFormSchema.parse(input);
  const created = await createTransaction(userId, data, {
    source: "nl",
    rawInput,
    llmMeta: meta,
  });
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/");
  return created;
}

export async function createBulkNlTransactionAction(
  rawInput: string,
  input: TransactionFormValues,
  meta: { modelUsed: string | null; confidence: number },
) {
  const userId = await requireUserId();
  const data = transactionFormSchema.parse(input);
  const created = await createTransaction(userId, data, {
    source: "bulk_nl",
    rawInput,
    llmMeta: meta,
  });
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/");
  return created;
}

export async function updateTransactionAction(id: string, input: TransactionFormValues) {
  const userId = await requireUserId();
  const data = transactionFormSchema.parse(input);
  const updated = await updateTransaction(userId, id, data);
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/");
  return updated;
}

export async function deleteTransactionAction(id: string) {
  const userId = await requireUserId();
  await softDeleteTransaction(userId, id);
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/");
}

export async function undoDeleteTransactionAction(id: string) {
  const userId = await requireUserId();
  await restoreTransaction(userId, id);
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/");
}
