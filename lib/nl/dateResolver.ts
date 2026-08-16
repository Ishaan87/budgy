export type DateMatch = { date: Date; matchedText: string };

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function atMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function monthIndex(name: string): number {
  const lower = name.toLowerCase();
  return MONTHS.findIndex((m) => m.startsWith(lower.slice(0, 3)));
}

/** Resolves the first relative-date phrase found in `text`, relative to `now`. */
export function resolveDate(text: string, now: Date = new Date()): DateMatch | null {
  const lower = text.toLowerCase();
  const today = atMidnight(now);

  if (/\btoday\b/.test(lower)) {
    return { date: today, matchedText: "today" };
  }
  if (/\byesterday\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return { date: d, matchedText: "yesterday" };
  }
  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return { date: d, matchedText: "tomorrow" };
  }

  const daysAgoMatch = lower.match(/\b(\d+)\s+days?\s+ago\b/);
  if (daysAgoMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() - Number(daysAgoMatch[1]));
    return { date: d, matchedText: daysAgoMatch[0] };
  }

  const lastWeekdayMatch = lower.match(
    new RegExp(`\\blast\\s+(${WEEKDAYS.join("|")})\\b`),
  );
  if (lastWeekdayMatch) {
    const targetDow = WEEKDAYS.indexOf(lastWeekdayMatch[1]);
    const d = new Date(today);
    let diff = (d.getDay() - targetDow + 7) % 7;
    if (diff === 0) diff = 7;
    d.setDate(d.getDate() - diff);
    return { date: d, matchedText: lastWeekdayMatch[0] };
  }

  // Bare weekday name ("on tuesday") means the most recent past (or today's) occurrence.
  const weekdayMatch = lower.match(new RegExp(`\\b(${WEEKDAYS.join("|")})\\b`));
  if (weekdayMatch) {
    const targetDow = WEEKDAYS.indexOf(weekdayMatch[1]);
    const d = new Date(today);
    const diff = (d.getDay() - targetDow + 7) % 7;
    d.setDate(d.getDate() - diff);
    return { date: d, matchedText: weekdayMatch[0] };
  }

  // "12 aug", "aug 12", "12th august", "august 12th"
  const dayMonthMatch = lower.match(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS.join("|")})\\w*\\b`),
  );
  const monthDayMatch = lower.match(
    new RegExp(`\\b(${MONTHS.join("|")})\\w*\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`),
  );
  if (dayMonthMatch || monthDayMatch) {
    const day = Number(dayMonthMatch ? dayMonthMatch[1] : monthDayMatch![2]);
    const month = monthIndex(dayMonthMatch ? dayMonthMatch[2] : monthDayMatch![1]);
    const matchedText = (dayMonthMatch ?? monthDayMatch)![0];
    let year = today.getFullYear();
    let candidate = new Date(year, month, day);
    if (candidate > today) {
      year -= 1;
      candidate = new Date(year, month, day);
    }
    return { date: candidate, matchedText };
  }

  // "on the 3rd", "on 3rd" — this month, or last month if that day hasn't happened yet.
  const ordinalDayMatch = lower.match(/\bon\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/);
  if (ordinalDayMatch) {
    const day = Number(ordinalDayMatch[1]);
    let candidate = new Date(today.getFullYear(), today.getMonth(), day);
    if (candidate > today) {
      candidate = new Date(today.getFullYear(), today.getMonth() - 1, day);
    }
    return { date: candidate, matchedText: ordinalDayMatch[0] };
  }

  return null;
}
