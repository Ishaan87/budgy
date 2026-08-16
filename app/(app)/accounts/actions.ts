"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { accountAliases, accounts, categories } from "@/lib/db/schema";
import { requireUserId } from "@/lib/supabase/server";
import { accountFormSchema, type AccountFormValues } from "@/lib/validation/account";
import { categoryFormSchema, type CategoryFormValues } from "@/lib/validation/category";

function slugAlias(name: string) {
  return name.trim().toLowerCase();
}

export async function createAccount(input: AccountFormValues) {
  const userId = await requireUserId();
  const data = accountFormSchema.parse(input);

  const [created] = await db
    .insert(accounts)
    .values({
      userId,
      name: data.name,
      type: data.type,
      openingBalance: data.openingBalance.toFixed(2),
      creditLimit: data.creditLimit != null ? data.creditLimit.toFixed(2) : null,
      statementDay: data.statementDay ?? null,
      dueDay: data.dueDay ?? null,
      icon: data.icon || null,
      color: data.color || null,
    })
    .returning();

  await db
    .insert(accountAliases)
    .values({ userId, accountId: created.id, alias: slugAlias(data.name) })
    .onConflictDoNothing();

  revalidatePath("/accounts");
  return created;
}

export async function updateAccount(accountId: string, input: AccountFormValues) {
  const userId = await requireUserId();
  const data = accountFormSchema.parse(input);

  const [updated] = await db
    .update(accounts)
    .set({
      name: data.name,
      type: data.type,
      openingBalance: data.openingBalance.toFixed(2),
      creditLimit: data.creditLimit != null ? data.creditLimit.toFixed(2) : null,
      statementDay: data.statementDay ?? null,
      dueDay: data.dueDay ?? null,
      icon: data.icon || null,
      color: data.color || null,
    })
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .returning();

  if (!updated) throw new Error("Account not found");
  revalidatePath("/accounts");
  return updated;
}

export async function archiveAccount(accountId: string, isArchived: boolean) {
  const userId = await requireUserId();
  await db
    .update(accounts)
    .set({ isArchived })
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  revalidatePath("/accounts");
}

export async function createCategory(input: CategoryFormValues) {
  const userId = await requireUserId();
  const data = categoryFormSchema.parse(input);

  const [created] = await db
    .insert(categories)
    .values({
      userId,
      name: data.name,
      kind: data.kind,
      parentId: data.parentId || null,
      icon: data.icon || null,
      color: data.color || null,
    })
    .returning();

  revalidatePath("/accounts");
  return created;
}

export async function updateCategory(categoryId: string, input: CategoryFormValues) {
  const userId = await requireUserId();
  const data = categoryFormSchema.parse(input);

  const [updated] = await db
    .update(categories)
    .set({
      name: data.name,
      kind: data.kind,
      parentId: data.parentId || null,
      icon: data.icon || null,
      color: data.color || null,
    })
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .returning();

  if (!updated) throw new Error("Category not found");
  revalidatePath("/accounts");
  return updated;
}

export async function archiveCategory(categoryId: string, isArchived: boolean) {
  const userId = await requireUserId();
  await db
    .update(categories)
    .set({ isArchived })
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
  revalidatePath("/accounts");
}
