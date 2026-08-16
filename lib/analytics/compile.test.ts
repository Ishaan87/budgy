import { describe, expect, it, vi } from "vitest";
import { querySpecSchema } from "./querySpec";

const executedQueries: unknown[] = [];

vi.mock("@/lib/db/client", () => ({
  db: {
    execute: async (query: unknown) => {
      executedQueries.push(query);
      return [];
    },
  },
}));

describe("querySpecSchema", () => {
  it("rejects any field outside the whitelist", () => {
    const result = querySpecSchema.safeParse({
      metric: "sum_amount",
      filters: [{ field: "user_id", op: "eq", value: "x" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a raw-SQL-shaped field name", () => {
    const result = querySpecSchema.safeParse({
      metric: "sum_amount",
      filters: [{ field: "1); DROP TABLE transactions; --", op: "eq", value: "x" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed spec with whitelisted fields", () => {
    const result = querySpecSchema.safeParse({
      metric: "sum_amount",
      filters: [{ field: "category_name", op: "contains", value: "Food" }],
      groupBy: "category_name",
    });
    expect(result.success).toBe(true);
  });
});

describe("runAnalyticsQuery", () => {
  it("never inlines a filter value into the static SQL text", async () => {
    const { runAnalyticsQuery } = await import("./compile");
    const malicious = "'; DROP TABLE transactions; --";

    await runAnalyticsQuery("user-1", {
      metric: "sum_amount",
      filters: [{ field: "merchant", op: "eq", value: malicious }],
      groupBy: null,
      dateFrom: null,
      dateTo: null,
      limit: 10,
    });

    const query = executedQueries.at(-1) as { queryChunks: unknown[] };

    // Recursively collect static text (StringChunks: { value: [...] }) separately from bound
    // parameters (bare values interpolated into the template) across the nested SQL tree
    // produced by sql.join(). The malicious value must only ever appear as a bound parameter.
    const staticText: string[] = [];
    const boundParams: unknown[] = [];
    function walk(node: unknown) {
      if (node && typeof node === "object" && "value" in node && Array.isArray((node as { value: unknown }).value)) {
        staticText.push((node as { value: string[] }).value.join(""));
      } else if (node && typeof node === "object" && "queryChunks" in node) {
        (node as { queryChunks: unknown[] }).queryChunks.forEach(walk);
      } else {
        boundParams.push(node);
      }
    }
    walk(query);

    expect(staticText.join("")).not.toContain("DROP TABLE");
    expect(boundParams).toContain(malicious);
  });
});
