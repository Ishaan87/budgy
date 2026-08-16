import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, categories, transactionSplits, transactions } from "@/lib/db/schema";
import type { TransactionFilters, TransactionFormValues } from "@/lib/validation/transaction";

export async function listTransactions(userId: string, filters: TransactionFilters) {
  const conditions = [eq(transactions.userId, userId), eq(transactions.isDeleted, false)];

  if (filters.accountId) conditions.push(eq(transactions.accountId, filters.accountId));
  if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
  if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.from) conditions.push(gte(transactions.occurredAt, filters.from));
  if (filters.to) conditions.push(lte(transactions.occurredAt, filters.to));
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(or(ilike(transactions.merchant, term), ilike(transactions.note, term))!);
  }

  const where = and(...conditions);

  const accountAlias = accounts;
  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      occurredAt: transactions.occurredAt,
      merchant: transactions.merchant,
      note: transactions.note,
      tags: transactions.tags,
      source: transactions.source,
      accountId: transactions.accountId,
      accountName: accountAlias.name,
      toAccountId: transactions.toAccountId,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
    })
    .from(transactions)
    .leftJoin(accountAlias, eq(accountAlias.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(where)
    .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
    .limit(filters.pageSize)
    .offset((filters.page - 1) * filters.pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(where);

  return { rows, total: count };
}

/** Same-day, same-amount check used by bulk NL import to flag likely duplicates. */
export async function findPotentialDuplicate(userId: string, amount: number, occurredAt: Date) {
  const dayStart = new Date(occurredAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [match] = await db
    .select({ id: transactions.id, merchant: transactions.merchant })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.isDeleted, false),
        eq(transactions.amount, amount.toFixed(2)),
        gte(transactions.occurredAt, dayStart),
        lte(transactions.occurredAt, dayEnd),
      ),
    )
    .limit(1);

  return match ?? null;
}

export async function getTransactionWithSplits(userId: string, id: string) {
  const [transaction] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  if (!transaction) return null;

  const splits = await db
    .select()
    .from(transactionSplits)
    .where(eq(transactionSplits.transactionId, id));

  return { transaction, splits };
}

/**
 * Creates a transaction and its splits (if any) in one DB transaction. The
 * transaction_splits sum-check trigger is deferred, so splits can be inserted after the
 * parent row without violating the constraint mid-transaction.
 */
export async function createTransaction(
  userId: string,
  data: TransactionFormValues,
  meta?: { source?: "manual" | "nl" | "bulk_nl" | "import" | "recurring"; rawInput?: string; llmMeta?: unknown },
) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(transactions)
      .values({
        userId,
        type: data.type,
        amount: data.amount.toFixed(2),
        accountId: data.accountId,
        toAccountId: data.type === "transfer" ? data.toAccountId : null,
        categoryId: data.type === "transfer" ? null : data.categoryId,
        occurredAt: data.occurredAt,
        merchant: data.merchant || null,
        note: data.note || null,
        tags: data.tags,
        source: meta?.source ?? "manual",
        rawInput: meta?.rawInput,
        llmMeta: meta?.llmMeta,
      })
      .returning();

    if (data.splits.length > 0) {
      await tx.insert(transactionSplits).values(
        data.splits.map((s) => ({
          transactionId: created.id,
          categoryId: s.categoryId,
          amount: s.amount.toFixed(2),
          note: s.note || null,
        })),
      );
    }

    return created;
  });
}

export async function updateTransaction(userId: string, id: string, data: TransactionFormValues) {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(transactions)
      .set({
        type: data.type,
        amount: data.amount.toFixed(2),
        accountId: data.accountId,
        toAccountId: data.type === "transfer" ? data.toAccountId : null,
        categoryId: data.type === "transfer" ? null : data.categoryId,
        occurredAt: data.occurredAt,
        merchant: data.merchant || null,
        note: data.note || null,
        tags: data.tags,
        updatedAt: new Date(),
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
      .returning();

    if (!updated) throw new Error("Transaction not found");

    await tx.delete(transactionSplits).where(eq(transactionSplits.transactionId, id));
    if (data.splits.length > 0) {
      await tx.insert(transactionSplits).values(
        data.splits.map((s) => ({
          transactionId: id,
          categoryId: s.categoryId,
          amount: s.amount.toFixed(2),
          note: s.note || null,
        })),
      );
    }

    return updated;
  });
}

export async function softDeleteTransaction(userId: string, id: string) {
  const [deleted] = await db
    .update(transactions)
    .set({ isDeleted: true, deletedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning();
  return deleted ?? null;
}

export async function restoreTransaction(userId: string, id: string) {
  const [restored] = await db
    .update(transactions)
    .set({ isDeleted: false, deletedAt: null })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning();
  return restored ?? null;
}
