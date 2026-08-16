import { describe, expect, it } from "vitest";
import { projectMonthEnd } from "./projections";

describe("projectMonthEnd", () => {
  it("projects linearly from month-to-date spend", () => {
    // 10 days into a 30-day month, spent 3000 -> 300/day -> 9000 projected
    const reference = new Date(2026, 3, 10); // April has 30 days
    const { dailyAverage, projected } = projectMonthEnd(3000, reference);
    expect(dailyAverage).toBe(300);
    expect(projected).toBe(9000);
  });

  it("handles the first day of the month without dividing by zero", () => {
    const reference = new Date(2026, 3, 1);
    const { dailyAverage, projected } = projectMonthEnd(500, reference);
    expect(dailyAverage).toBe(500);
    expect(projected).toBe(15000);
  });
});
