import { ANALYTICS_FIELDS } from "./querySpec";
import type { AnalyticsRow } from "./compile";

export function buildQuerySpecSystemPrompt(opts: { todayIso: string }): string {
  return `You translate a question about personal finances into a query spec — you never write SQL.

Available fields: ${ANALYTICS_FIELDS.join(", ")} (occurred_at is an ISO date).
Available metrics: sum_amount, count, avg_amount.
Filter operators: eq, contains, gte, lte.
Today's date is ${opts.todayIso}. Resolve relative date ranges ("this month", "last week") into dateFrom/dateTo ISO dates.
groupBy is one of the available fields, or null for a single total.
Filter "type" values must be exactly "expense", "income", or "transfer".
Reply with ONLY the JSON object matching the schema.`;
}

export function buildQuerySpecUserPrompt(question: string): string {
  return question;
}

export function buildAnswerSystemPrompt(): string {
  return `You are given a personal-finance question and the numeric result of a query already run
against the user's own data. Write ONE short, plain-English sentence answering the question using
those numbers (INR, Indian digit grouping like "₹1,20,000"). Do not invent numbers not present in
the result. If the result is a breakdown (multiple rows), summarize the top items.`;
}

export function buildAnswerUserPrompt(question: string, rows: AnalyticsRow[]): string {
  return `Question: "${question}"\nResult rows (label, value): ${JSON.stringify(rows)}`;
}
