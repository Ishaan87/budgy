import { z } from "zod";

export const ruleConditionSchema = z.object({
  field: z.enum(["merchant", "note", "accountId", "text"]),
  op: z.enum(["contains", "equals", "startsWith"]),
  value: z.string().min(1),
});
export type RuleCondition = z.infer<typeof ruleConditionSchema>;

export const ruleMatchSchema = z.array(ruleConditionSchema).min(1);
export const ruleSetSchema = z.object({
  categoryId: z.string().uuid(),
  tags: z.array(z.string()).optional(),
});
export type RuleSet = z.infer<typeof ruleSetSchema>;

export type RuleLike = {
  id: string;
  priority: number;
  match: RuleCondition[];
  set: RuleSet;
  isActive: boolean;
};

export type MatchableTransaction = {
  merchant?: string | null;
  note?: string | null;
  accountId?: string | null;
  /** Free text fallback (e.g. the raw NL input) for rules matching against `text`. */
  text?: string | null;
};

function fieldValue(txn: MatchableTransaction, field: RuleCondition["field"]): string {
  const raw = field === "text" ? txn.text : txn[field];
  return (raw ?? "").toString().toLowerCase();
}

function conditionMatches(condition: RuleCondition, txn: MatchableTransaction): boolean {
  const value = fieldValue(txn, condition.field);
  const target = condition.value.toLowerCase();
  switch (condition.op) {
    case "contains":
      return value.includes(target);
    case "equals":
      return value === target;
    case "startsWith":
      return value.startsWith(target);
  }
}

export function ruleMatches(rule: RuleLike, txn: MatchableTransaction): boolean {
  return rule.isActive && rule.match.every((condition) => conditionMatches(condition, txn));
}

/** Returns the first matching rule's category/tags, in priority order (lower number = higher priority). */
export function applyRules(rules: RuleLike[], txn: MatchableTransaction): RuleSet | null {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  const match = sorted.find((rule) => ruleMatches(rule, txn));
  return match ? match.set : null;
}

/** Which of the given past transactions each rule would have matched — used for the "preview" UI. */
export function previewRuleMatches(rule: RuleLike, transactions: MatchableTransaction[]): number {
  return transactions.filter((txn) => ruleMatches(rule, txn)).length;
}
