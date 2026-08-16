import { and, asc, eq, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { accounts, categories, recurringRules } from "@/lib/db/schema";

export async function listRecurringRules(userId: string) {
  return db
    .select({
      id: recurringRules.id,
      name: recurringRules.name,
      type: recurringRules.type,
      amount: recurringRules.amount,
      accountId: recurringRules.accountId,
      accountName: accounts.name,
      categoryId: recurringRules.categoryId,
      categoryName: categories.name,
      frequency: recurringRules.frequency,
      interval: recurringRules.interval,
      dayOfMonth: recurringRules.dayOfMonth,
      weekday: recurringRules.weekday,
      nextRunOn: recurringRules.nextRunOn,
      endOn: recurringRules.endOn,
      autoPost: recurringRules.autoPost,
      isActive: recurringRules.isActive,
    })
    .from(recurringRules)
    .innerJoin(accounts, eq(accounts.id, recurringRules.accountId))
    .leftJoin(categories, eq(categories.id, recurringRules.categoryId))
    .where(eq(recurringRules.userId, userId))
    .orderBy(asc(recurringRules.nextRunOn));
}

/** All due, active, auto-posting rules across every user — used by the recurring cron. */
export async function listDueRecurringRules(asOf: Date) {
  const dateStr = asOf.toISOString().slice(0, 10);
  return db
    .select()
    .from(recurringRules)
    .where(and(eq(recurringRules.isActive, true), eq(recurringRules.autoPost, true), lte(recurringRules.nextRunOn, dateStr)));
}
