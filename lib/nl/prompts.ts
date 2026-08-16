export function buildNlSystemPrompt(opts: {
  accounts: { name: string }[];
  categories: { name: string; kind: "expense" | "income" }[];
  todayIso: string;
}): string {
  const accountList = opts.accounts.map((a) => `- ${a.name}`).join("\n");
  const expenseCategories = opts.categories.filter((c) => c.kind === "expense").map((c) => c.name);
  const incomeCategories = opts.categories.filter((c) => c.kind === "income").map((c) => c.name);

  return `You extract a single financial transaction from a short, casual note written by an Indian user (amounts are in INR unless stated otherwise). Today's date is ${opts.todayIso}.

The user's accounts:
${accountList || "(none yet)"}

Expense categories: ${expenseCategories.join(", ") || "(none)"}
Income categories: ${incomeCategories.join(", ") || "(none)"}

Rules:
- "type" is "expense" for spending, "income" for money received, "transfer" for moving money between the user's own accounts.
- Pick accountName/toAccountName/categoryName ONLY from the lists above, matching as closely as possible. If nothing matches, use null.
- toAccountName is only set for transfers.
- occurredAtIso is an ISO 8601 date (no time needed) resolved from any relative date phrase ("yesterday", "last tuesday"); if no date is mentioned, use today.
- merchant is a short proper-cased name if identifiable (e.g. "Zomato", "Raj"), else null.
- confidence is your own 0-1 estimate of how sure you are about the full extraction.
- Reply with ONLY the JSON object matching the required schema — no prose, no markdown fences.`;
}

export function buildNlUserPrompt(text: string): string {
  return `Note: "${text}"`;
}
