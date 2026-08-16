export type AmountMatch = { amount: number; matchedText: string; index: number };

const CURRENCY_PATTERN =
  /(?:₹|rs\.?|inr|rupees)\s?(\d[\d,]*(?:\.\d+)?)\s?(k\b)?|(\d[\d,]*(?:\.\d+)?)\s?(k\b)?\s?(?:₹|rs\.?|inr|rupees)/gi;
const BARE_NUMBER_PATTERN = /\b(\d[\d,]*(?:\.\d+)?)\s?(k\b)?/gi;

/**
 * Extracts a rupee amount from free text, assuming date phrases have already been removed by
 * the caller (so a lone "12" from "12 aug" is never mistaken for an amount). Prefers a match
 * with an explicit currency marker ("50rs", "₹50", "rs 50") over a bare number.
 */
export function parseAmount(text: string): AmountMatch | null {
  for (const match of text.matchAll(CURRENCY_PATTERN)) {
    const numeric = (match[1] ?? match[3])?.replace(/,/g, "");
    const kSuffix = match[2] ?? match[4];
    if (!numeric) continue;
    const amount = Number.parseFloat(numeric) * (kSuffix ? 1000 : 1);
    if (Number.isFinite(amount) && amount > 0) {
      return { amount, matchedText: match[0], index: match.index ?? 0 };
    }
  }

  for (const match of text.matchAll(BARE_NUMBER_PATTERN)) {
    const numeric = match[1].replace(/,/g, "");
    const amount = Number.parseFloat(numeric) * (match[2] ? 1000 : 1);
    if (Number.isFinite(amount) && amount > 0) {
      return { amount, matchedText: match[0], index: match.index ?? 0 };
    }
  }

  return null;
}
