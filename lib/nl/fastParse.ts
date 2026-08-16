import { parseAmount } from "./amountParser";
import { resolveDate } from "./dateResolver";
import { applyRules, ruleMatches, type MatchableTransaction, type RuleLike } from "@/lib/rules/engine";
import type { FieldSource, NlDraft } from "./schemas";

const TRANSFER_KEYWORDS = /\b(transfer(?:red)?|moved|move)\b/i;
const INCOME_KEYWORDS = /\b(got|received|credited|credit|salary|refund(?:ed)?|cashback|earned|income)\b/i;
const PREPOSITION_PATTERN = /\b(from|via|using|with|on|to|at|for)\b/i;

export type FastParseAccount = { id: string; name: string };
export type FastParseAlias = { alias: string; accountId: string };

export type FastParseInput = {
  text: string;
  accounts: FastParseAccount[];
  aliases: FastParseAlias[];
  rules: RuleLike[];
  now?: Date;
};

export type FastParseResult = {
  draft: NlDraft;
  isConfident: boolean;
  matchedRuleId: string | null;
};

function stripMatch(text: string, matchedText: string | undefined): string {
  if (!matchedText) return text;
  return text.replace(matchedText, " ");
}

function findAccountMentions(text: string, aliases: FastParseAlias[]): { alias: FastParseAlias; index: number }[] {
  const lower = text.toLowerCase();
  const found: { alias: FastParseAlias; index: number }[] = [];
  for (const alias of aliases) {
    const idx = lower.indexOf(alias.alias.toLowerCase());
    if (idx >= 0) found.push({ alias, index: idx });
  }
  return found.sort((a, b) => a.index - b.index);
}

function extractMerchant(text: string): string | null {
  const cleaned = text
    .replace(PREPOSITION_PATTERN, " ")
    .replace(TRANSFER_KEYWORDS, " ")
    .replace(INCOME_KEYWORDS, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length > 60) return null;
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function fastParse(input: FastParseInput): FastParseResult {
  const { aliases, rules } = input;
  const now = input.now ?? new Date();
  let working = input.text;

  const sources: NlDraft["sources"] = {};
  let confidence = 0.3;

  const dateMatch = resolveDate(working, now);
  if (dateMatch) {
    working = stripMatch(working, dateMatch.matchedText);
    sources.occurredAt = "parsed";
    confidence += 0.1;
  }
  const occurredAt = (dateMatch?.date ?? now).toISOString();
  if (!dateMatch) sources.occurredAt = "default";

  const amountMatch = parseAmount(working);
  if (amountMatch) {
    working = stripMatch(working, amountMatch.matchedText);
    sources.amount = "parsed";
    confidence += 0.25;
  }

  let type: NlDraft["type"] = "expense";
  if (TRANSFER_KEYWORDS.test(working)) type = "transfer";
  else if (INCOME_KEYWORDS.test(working)) type = "income";
  sources.type = "parsed";

  const mentions = findAccountMentions(working, aliases);
  let accountId: string | null = null;
  let toAccountId: string | null = null;

  if (type === "transfer") {
    // "moved 5k to gpay [from cash]" — the mention after "to" is the destination.
    const toIndex = working.toLowerCase().indexOf("to ");
    const destMention = mentions.find((m) => toIndex >= 0 && m.index > toIndex) ?? mentions[0];
    const sourceMention = mentions.find((m) => m !== destMention);
    toAccountId = destMention?.alias.accountId ?? null;
    accountId = sourceMention?.alias.accountId ?? null;
    if (toAccountId) {
      sources.toAccountId = "parsed";
      confidence += 0.15;
    }
    if (accountId) {
      sources.accountId = "parsed";
      confidence += 0.1;
    }
  } else if (mentions.length > 0) {
    accountId = mentions[0].alias.accountId;
    sources.accountId = "parsed";
    confidence += 0.15;
  }

  for (const mention of mentions) {
    working = working.replace(new RegExp(mention.alias.alias, "i"), " ");
  }

  const merchant = extractMerchant(working);
  if (merchant) confidence += 0.1;

  const matchable: MatchableTransaction = {
    merchant,
    text: input.text,
    accountId,
  };
  const ruleResult = type === "transfer" ? null : applyRules(rules, matchable);
  const matchedRule =
    type === "transfer"
      ? null
      : [...rules].sort((a, b) => a.priority - b.priority).find((r) => ruleMatches(r, matchable));
  let categoryId: string | null = null;
  if (ruleResult) {
    categoryId = ruleResult.categoryId;
    sources.categoryId = "rule";
    confidence += 0.25;
  }

  confidence = Math.min(1, confidence);

  const draft: NlDraft = {
    type,
    amount: amountMatch?.amount ?? null,
    accountId,
    toAccountId,
    categoryId,
    merchant,
    note: null,
    occurredAt,
    tags: ruleResult?.tags ?? [],
    confidence,
    modelUsed: null,
    sources,
  };

  const hasRequiredFields =
    draft.amount != null && (type === "transfer" ? accountId != null && toAccountId != null : categoryId != null);

  return { draft, isConfident: confidence >= 0.8 && hasRequiredFields, matchedRuleId: matchedRule?.id ?? null };
}

export function accountsToAliases(accounts: FastParseAccount[]): FastParseAlias[] {
  return accounts.map((a) => ({ alias: a.name.toLowerCase(), accountId: a.id }));
}

export type { FieldSource };
