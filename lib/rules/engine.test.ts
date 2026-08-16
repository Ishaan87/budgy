import { describe, expect, it } from "vitest";
import { applyRules, previewRuleMatches, ruleMatches, type RuleLike } from "./engine";

const zomatoRule: RuleLike = {
  id: "r1",
  priority: 1,
  isActive: true,
  match: [{ field: "merchant", op: "contains", value: "zomato" }],
  set: { categoryId: "food-cat" },
};

const hdfcTransferRule: RuleLike = {
  id: "r2",
  priority: 0,
  isActive: true,
  match: [
    { field: "text", op: "contains", value: "hdfc" },
    { field: "text", op: "contains", value: "electricity" },
  ],
  set: { categoryId: "bills-cat", tags: ["utility"] },
};

describe("rules engine", () => {
  it("matches a single-condition rule case-insensitively", () => {
    expect(ruleMatches(zomatoRule, { merchant: "Zomato Order #123" })).toBe(true);
    expect(ruleMatches(zomatoRule, { merchant: "Swiggy" })).toBe(false);
  });

  it("requires every condition in a multi-condition rule", () => {
    expect(ruleMatches(hdfcTransferRule, { text: "paid electricity bill via hdfc" })).toBe(true);
    expect(ruleMatches(hdfcTransferRule, { text: "paid electricity bill via icici" })).toBe(false);
  });

  it("ignores inactive rules", () => {
    expect(ruleMatches({ ...zomatoRule, isActive: false }, { merchant: "zomato" })).toBe(false);
  });

  it("applies the highest-priority (lowest number) matching rule", () => {
    const txn = { merchant: "zomato", text: "zomato hdfc electricity" };
    // Both rules would match different fields; priority 0 (hdfcTransferRule) should win.
    const result = applyRules([zomatoRule, hdfcTransferRule], txn);
    expect(result?.categoryId).toBe("bills-cat");
  });

  it("returns null when nothing matches", () => {
    expect(applyRules([zomatoRule], { merchant: "uber" })).toBeNull();
  });

  it("counts how many past transactions a rule would have matched", () => {
    const past = [{ merchant: "Zomato" }, { merchant: "Swiggy" }, { merchant: "Zomato Gold" }];
    expect(previewRuleMatches(zomatoRule, past)).toBe(2);
  });
});
