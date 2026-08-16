import { describe, expect, it } from "vitest";
import { addPaise, paiseToRupeeString, rupeesToPaise, splitEvenly, splitsMatchTotal, sumRupees } from "./money";

describe("money", () => {
  it("converts rupees to paise without float drift", () => {
    expect(rupeesToPaise(50)).toBe(5000);
    expect(rupeesToPaise("19.99")).toBe(1999);
    expect(rupeesToPaise(0.1)).toBe(10);
  });

  it("sums rupee amounts exactly", () => {
    expect(sumRupees(["0.1", "0.2"])).toBe(0.3);
    expect(sumRupees([10, 20, 30])).toBe(60);
  });

  it("adds paise", () => {
    expect(addPaise(100, 200, 300)).toBe(600);
  });

  it("formats paise back to a 2-decimal rupee string", () => {
    expect(paiseToRupeeString(150000)).toBe("1500.00");
  });

  it("validates splits sum to the parent total", () => {
    expect(splitsMatchTotal(100, [50, 50])).toBe(true);
    expect(splitsMatchTotal(100, [50, 49.99])).toBe(false);
  });

  it("splits a total evenly, distributing remainder paise to the first shares", () => {
    const parts = splitEvenly(10, 3);
    expect(parts).toEqual([3.34, 3.33, 3.33]);
    expect(sumRupees(parts)).toBe(10);
  });
});
