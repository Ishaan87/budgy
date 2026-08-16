import { describe, expect, it } from "vitest";
import { computeDebtBalance } from "./balance";

describe("computeDebtBalance", () => {
  it("computes what a friend still owes me", () => {
    const balance = computeDebtBalance("owed_to_me", [
      { type: "lend", amount: 500 },
      { type: "lend", amount: 200 },
      { type: "repayment", amount: 300 },
    ]);
    expect(balance).toBe(400);
  });

  it("computes what I still owe someone", () => {
    const balance = computeDebtBalance("i_owe", [
      { type: "borrow", amount: 1000 },
      { type: "repayment", amount: 1000 },
    ]);
    expect(balance).toBe(0);
  });

  it("never goes negative on overpayment", () => {
    const balance = computeDebtBalance("i_owe", [
      { type: "borrow", amount: 100 },
      { type: "repayment", amount: 150 },
    ]);
    expect(balance).toBe(0);
  });

  it("ignores entries that don't apply to the direction", () => {
    const balance = computeDebtBalance("owed_to_me", [{ type: "borrow", amount: 999 }]);
    expect(balance).toBe(0);
  });
});
