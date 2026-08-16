export type DebtDirection = "owed_to_me" | "i_owe";
export type DebtEntryType = "lend" | "borrow" | "repayment";
export type DebtEntry = { type: DebtEntryType; amount: number };

/**
 * Outstanding balance for a debt: how much is still owed. For `owed_to_me`, lend entries
 * increase the balance and repayments decrease it. For `i_owe`, borrow entries increase it
 * and repayments decrease it. Always clamped to zero (can't go "negative-owed").
 */
export function computeDebtBalance(direction: DebtDirection, entries: DebtEntry[]): number {
  const increaseType: DebtEntryType = direction === "owed_to_me" ? "lend" : "borrow";
  const increases = entries.filter((e) => e.type === increaseType).reduce((sum, e) => sum + e.amount, 0);
  const repayments = entries.filter((e) => e.type === "repayment").reduce((sum, e) => sum + e.amount, 0);
  return Math.max(0, increases - repayments);
}
