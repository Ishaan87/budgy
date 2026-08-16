import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { recurringRules } from "@/lib/db/schema";
import { verifyCronSecret } from "@/lib/cron/auth";
import { listDueRecurringRules } from "@/lib/db/queries/recurring";
import { createTransaction } from "@/lib/db/queries/transactions";
import { computeNextRun } from "@/lib/recurring/schedule";

const MAX_CATCHUP_OCCURRENCES = 366;

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueRules = await listDueRecurringRules(today);

  let posted = 0;
  let deactivated = 0;

  for (const rule of dueRules) {
    let nextRunOn = new Date(rule.nextRunOn);
    const endOn = rule.endOn ? new Date(rule.endOn) : null;
    let iterations = 0;
    let lastPostedOn: Date | null = null;

    while (nextRunOn <= today && (!endOn || nextRunOn <= endOn) && iterations < MAX_CATCHUP_OCCURRENCES) {
      await createTransaction(
        rule.userId,
        {
          type: rule.type,
          amount: Number(rule.amount),
          accountId: rule.accountId,
          toAccountId: rule.toAccountId,
          categoryId: rule.categoryId,
          occurredAt: nextRunOn,
          merchant: rule.merchant ?? undefined,
          note: undefined,
          tags: [],
          splits: [],
        },
        { source: "recurring", rawInput: rule.name },
      );
      posted += 1;
      lastPostedOn = nextRunOn;
      nextRunOn = computeNextRun(nextRunOn, rule.frequency, rule.interval, {
        dayOfMonth: rule.dayOfMonth,
        weekday: rule.weekday,
      });
      iterations += 1;
    }

    const pastEnd = endOn != null && nextRunOn > endOn;
    await db
      .update(recurringRules)
      .set({
        nextRunOn: nextRunOn.toISOString().slice(0, 10),
        lastPostedOn: lastPostedOn ? lastPostedOn.toISOString().slice(0, 10) : rule.lastPostedOn,
        isActive: pastEnd ? false : rule.isActive,
      })
      .where(eq(recurringRules.id, rule.id));

    if (pastEnd) deactivated += 1;
  }

  return NextResponse.json({ rulesProcessed: dueRules.length, transactionsPosted: posted, deactivated });
}
