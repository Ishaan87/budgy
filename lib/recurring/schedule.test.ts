import { describe, expect, it } from "vitest";
import { computeNextRun } from "./schedule";

describe("computeNextRun", () => {
  it("adds N days for daily frequency", () => {
    const next = computeNextRun(new Date(2026, 0, 1), "daily", 3);
    expect(next.toDateString()).toBe(new Date(2026, 0, 4).toDateString());
  });

  it("adds N weeks and pins to a weekday", () => {
    // Jan 1 2026 is a Thursday. Weekly, pinned to Monday (1).
    const next = computeNextRun(new Date(2026, 0, 1), "weekly", 1, { weekday: 1 });
    expect(next.getDay()).toBe(1);
    expect(next.toDateString()).toBe(new Date(2026, 0, 12).toDateString());
  });

  it("advances by N months, pinned to a day of month", () => {
    const next = computeNextRun(new Date(2026, 0, 15), "monthly", 1, { dayOfMonth: 31 });
    // Feb 2026 has 28 days -> clamps to Feb 28
    expect(next.toDateString()).toBe(new Date(2026, 1, 28).toDateString());
  });

  it("advances by N years, pinned to day of month", () => {
    const next = computeNextRun(new Date(2026, 1, 28), "yearly", 1, { dayOfMonth: 29 });
    // 2027 is not a leap year -> clamps Feb 29 to Feb 28
    expect(next.toDateString()).toBe(new Date(2027, 1, 28).toDateString());
  });

  it("defaults interval to 1 when given 0 or negative", () => {
    const next = computeNextRun(new Date(2026, 0, 1), "daily", 0);
    expect(next.toDateString()).toBe(new Date(2026, 0, 2).toDateString());
  });
});
