import { describe, expect, it } from "vitest";
import { fastParse, type FastParseAccount, type FastParseAlias } from "./fastParse";
import type { RuleLike } from "@/lib/rules/engine";

const NOW = new Date(2026, 7, 15); // Friday 15 Aug 2026

const accounts: FastParseAccount[] = [
  { id: "acc-cash", name: "Cash" },
  { id: "acc-hdfc", name: "HDFC" },
  { id: "acc-gpay", name: "GPay" },
];

const aliases: FastParseAlias[] = [
  { alias: "cash", accountId: "acc-cash" },
  { alias: "hdfc", accountId: "acc-hdfc" },
  { alias: "gpay", accountId: "acc-gpay" },
];

const rules: RuleLike[] = [
  {
    id: "r1",
    priority: 0,
    isActive: true,
    match: [{ field: "text", op: "contains", value: "momos" }],
    set: { categoryId: "food-cat" },
  },
  {
    id: "r2",
    priority: 1,
    isActive: true,
    match: [{ field: "text", op: "contains", value: "electricity" }],
    set: { categoryId: "bills-cat", tags: ["utility"] },
  },
];

describe("fastParse", () => {
  it("parses a simple expense with an amount and merchant", () => {
    const { draft, isConfident } = fastParse({ text: "50rs spent on momos", accounts, aliases, rules, now: NOW });
    expect(draft.amount).toBe(50);
    expect(draft.type).toBe("expense");
    expect(draft.categoryId).toBe("food-cat");
    expect(isConfident).toBe(true);
  });

  it("parses an expense with account and relative date", () => {
    const { draft } = fastParse({
      text: "paid 1200 electricity from hdfc last tuesday",
      accounts,
      aliases,
      rules,
      now: NOW,
    });
    expect(draft.amount).toBe(1200);
    expect(draft.accountId).toBe("acc-hdfc");
    expect(draft.categoryId).toBe("bills-cat");
    expect(draft.tags).toContain("utility");
    // "last tuesday" relative to Fri 15 Aug 2026 -> Tue 11 Aug 2026
    const resolved = new Date(draft.occurredAt);
    expect([resolved.getFullYear(), resolved.getMonth(), resolved.getDate()]).toEqual([2026, 7, 11]);
  });

  it("detects income keywords", () => {
    const { draft } = fastParse({ text: "got 500 back from raj", accounts, aliases, rules, now: NOW });
    expect(draft.amount).toBe(500);
    expect(draft.type).toBe("income");
  });

  it("detects transfers and resolves the destination account", () => {
    const { draft } = fastParse({ text: "moved 5k to gpay", accounts, aliases, rules, now: NOW });
    expect(draft.amount).toBe(5000);
    expect(draft.type).toBe("transfer");
    expect(draft.toAccountId).toBe("acc-gpay");
  });

  it("resolves both accounts for a transfer with from/to", () => {
    const { draft, isConfident } = fastParse({
      text: "transferred 2000 from cash to hdfc",
      accounts,
      aliases,
      rules,
      now: NOW,
    });
    expect(draft.accountId).toBe("acc-cash");
    expect(draft.toAccountId).toBe("acc-hdfc");
    expect(isConfident).toBe(true);
  });

  it("defaults to today when no date phrase is present", () => {
    const { draft } = fastParse({ text: "20 for chai", accounts, aliases, rules, now: NOW });
    const resolved = new Date(draft.occurredAt);
    expect([resolved.getFullYear(), resolved.getMonth(), resolved.getDate()]).toEqual([2026, 7, 15]);
    expect(draft.sources.occurredAt).toBe("default");
  });

  it("is not confident when no rule matches a category", () => {
    const { isConfident } = fastParse({ text: "300 for something unusual", accounts, aliases, rules, now: NOW });
    expect(isConfident).toBe(false);
  });

  it("is not confident when no amount is found", () => {
    const { draft, isConfident } = fastParse({ text: "bought momos today", accounts, aliases, rules, now: NOW });
    expect(draft.amount).toBeNull();
    expect(isConfident).toBe(false);
  });
});
