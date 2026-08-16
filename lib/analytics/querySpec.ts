import { z } from "zod";

/**
 * The LLM's ONLY job in NL analytics is to produce one of these. It never writes SQL —
 * lib/analytics/compile.ts is the sole place that turns a spec into a query, against a
 * hardcoded whitelist of fields/operators. This makes injection structurally impossible
 * rather than merely guarded against.
 */
export const ANALYTICS_FIELDS = ["type", "account_name", "category_name", "merchant", "occurred_at"] as const;
export type AnalyticsField = (typeof ANALYTICS_FIELDS)[number];

export const querySpecSchema = z.object({
  metric: z.enum(["sum_amount", "count", "avg_amount"]),
  filters: z
    .array(
      z.object({
        field: z.enum(ANALYTICS_FIELDS),
        op: z.enum(["eq", "contains", "gte", "lte"]),
        value: z.string().max(200),
      }),
    )
    .max(5)
    .default([]),
  groupBy: z.enum(ANALYTICS_FIELDS).nullable().default(null),
  dateFrom: z.string().nullable().default(null),
  dateTo: z.string().nullable().default(null),
  limit: z.number().int().min(1).max(50).default(20),
});
export type QuerySpec = z.infer<typeof querySpecSchema>;
