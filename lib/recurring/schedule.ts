export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

function clampToMonthLength(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

/**
 * Computes the next occurrence strictly after `current`. `dayOfMonth` pins monthly/yearly
 * rules to a specific day (clamped to the shortest month, e.g. 31 -> 28/29 in February).
 * `weekday` (0=Sun..6=Sat) pins weekly rules to a specific day of the week.
 */
export function computeNextRun(
  current: Date,
  frequency: RecurringFrequency,
  interval: number,
  opts: { dayOfMonth?: number | null; weekday?: number | null } = {},
): Date {
  const step = Math.max(1, interval);

  switch (frequency) {
    case "daily": {
      const next = new Date(current);
      next.setDate(next.getDate() + step);
      return next;
    }
    case "weekly": {
      const next = new Date(current);
      next.setDate(next.getDate() + step * 7);
      if (opts.weekday != null) {
        const diff = (opts.weekday - next.getDay() + 7) % 7;
        next.setDate(next.getDate() + diff);
      }
      return next;
    }
    case "monthly": {
      const day = opts.dayOfMonth ?? current.getDate();
      return clampToMonthLength(current.getFullYear(), current.getMonth() + step, day);
    }
    case "yearly": {
      const day = opts.dayOfMonth ?? current.getDate();
      return clampToMonthLength(current.getFullYear() + step, current.getMonth(), day);
    }
  }
}
