import { describe, expect, it } from "vitest";
import { formatDateDMY, formatIndianNumber, formatINR, parseDMY } from "./inr";

describe("inr", () => {
  it("formats numbers with Indian digit grouping", () => {
    expect(formatIndianNumber(1234567)).toBe("12,34,567");
    expect(formatIndianNumber(1000)).toBe("1,000");
    expect(formatIndianNumber(999)).toBe("999");
  });

  it("formats currency with the rupee symbol", () => {
    expect(formatINR(50000)).toBe("₹50,000");
    expect(formatINR(1234.5, { showDecimals: true })).toBe("₹1,234.50");
  });

  it("formats and parses DD/MM/YYYY dates", () => {
    const d = new Date(2026, 7, 15);
    expect(formatDateDMY(d)).toBe("15/08/2026");
    expect(parseDMY("15/08/2026")?.getTime()).toBe(d.getTime());
  });
});
