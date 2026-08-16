import { listAccountAliases, listAccountsWithBalances } from "@/lib/db/queries/accounts";
import { listCategories } from "@/lib/db/queries/categories";
import { incrementRuleHitCount, listActiveRules } from "@/lib/db/queries/rules";
import { getCachedParse, hashInput, normalizeInput, setCachedParse } from "@/lib/db/queries/nlCache";
import { AllProvidersExhausted, complete } from "@/lib/llm/router";
import { accountsToAliases, fastParse } from "./fastParse";
import { buildNlSystemPrompt, buildNlUserPrompt } from "./prompts";
import { resolveByName } from "./resolve";
import { nlLlmResultSchema, type NlDraft } from "./schemas";

export type ParseTextResult = {
  draft: NlDraft;
  cached: boolean;
  llmUnavailable: boolean;
};

/**
 * Full NL entry pipeline for one line of free text: cache -> deterministic fast path ->
 * LLM fallback chain. See lib/llm/router.ts for the provider fallback/cooldown behavior.
 */
export async function parseTransactionText(userId: string, text: string): Promise<ParseTextResult> {
  const normalized = normalizeInput(text);
  const inputHash = hashInput(userId, normalized);

  const cached = await getCachedParse(userId, inputHash);
  if (cached) {
    return { draft: cached, cached: true, llmUnavailable: false };
  }

  const [accounts, categories, rules, aliasRows] = await Promise.all([
    listAccountsWithBalances(userId),
    listCategories(userId),
    listActiveRules(userId),
    listAccountAliases(userId),
  ]);

  const aliases =
    aliasRows.length > 0
      ? aliasRows.map((a) => ({ alias: a.alias, accountId: a.accountId }))
      : accountsToAliases(accounts);

  const fast = fastParse({ text, accounts, aliases, rules, now: new Date() });

  if (fast.isConfident) {
    if (fast.matchedRuleId) await incrementRuleHitCount(fast.matchedRuleId);
    await setCachedParse(userId, inputHash, text, fast.draft, null);
    return { draft: fast.draft, cached: false, llmUnavailable: false };
  }

  try {
    const { data, modelUsed } = await complete({
      userId,
      purpose: "nl_parse",
      schema: nlLlmResultSchema,
      schemaName: "transaction_extraction",
      system: buildNlSystemPrompt({ accounts, categories, todayIso: new Date().toISOString().slice(0, 10) }),
      user: buildNlUserPrompt(text),
    });

    const resolvedAccount = resolveByName(data.accountName, accounts);
    const resolvedToAccount = resolveByName(data.toAccountName, accounts);
    const resolvedCategory = resolveByName(data.categoryName, categories);

    const draft: NlDraft = {
      type: data.type,
      amount: data.amount,
      accountId: resolvedAccount?.id ?? fast.draft.accountId,
      toAccountId: resolvedToAccount?.id ?? fast.draft.toAccountId,
      categoryId: resolvedCategory?.id ?? fast.draft.categoryId,
      merchant: data.merchant ?? fast.draft.merchant,
      note: data.note,
      occurredAt: data.occurredAtIso ? new Date(data.occurredAtIso).toISOString() : fast.draft.occurredAt,
      tags: fast.draft.tags,
      confidence: data.confidence,
      modelUsed,
      sources: {
        type: "llm",
        amount: "llm",
        accountId: resolvedAccount ? "llm" : fast.draft.sources.accountId,
        toAccountId: resolvedToAccount ? "llm" : fast.draft.sources.toAccountId,
        categoryId: resolvedCategory ? "llm" : fast.draft.sources.categoryId,
        occurredAt: data.occurredAtIso ? "llm" : fast.draft.sources.occurredAt,
      },
    };

    await setCachedParse(userId, inputHash, text, draft, modelUsed);
    return { draft, cached: false, llmUnavailable: false };
  } catch (err) {
    if (err instanceof AllProvidersExhausted) {
      // Best effort: hand back whatever the deterministic pass could figure out so the user
      // can still confirm/edit manually instead of hitting a dead end.
      return { draft: fast.draft, cached: false, llmUnavailable: true };
    }
    throw err;
  }
}
