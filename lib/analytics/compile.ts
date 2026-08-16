import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { AnalyticsField, QuerySpec } from "./querySpec";

/**
 * Maps a whitelisted field name to its column expression. This is the ONLY place a field
 * name touches SQL, and it goes through a switch over a fixed enum — never string
 * interpolation of a caller-supplied identifier.
 */
function columnFor(field: AnalyticsField): SQL {
  switch (field) {
    case "type":
      return sql`type::text`;
    case "account_name":
      return sql`account_name`;
    case "category_name":
      return sql`category_name`;
    case "merchant":
      return sql`merchant`;
    case "occurred_at":
      return sql`occurred_at`;
  }
}

function metricExpression(metric: QuerySpec["metric"]): SQL {
  switch (metric) {
    case "sum_amount":
      return sql`coalesce(sum(amount), 0)`;
    case "count":
      return sql`count(*)`;
    case "avg_amount":
      return sql`coalesce(avg(amount), 0)`;
  }
}

function filterClause(filter: QuerySpec["filters"][number]): SQL {
  const column = columnFor(filter.field);
  switch (filter.op) {
    case "eq":
      return sql`${column} = ${filter.value}`;
    case "contains":
      return sql`${column} ilike ${"%" + filter.value + "%"}`;
    case "gte":
      return sql`${column} >= ${filter.value}`;
    case "lte":
      return sql`${column} <= ${filter.value}`;
  }
}

export type AnalyticsRow = { label: string | null; value: number };

/** Compiles a validated QuerySpec into a parameterized query and runs it, scoped to userId. */
export async function runAnalyticsQuery(userId: string, spec: QuerySpec): Promise<AnalyticsRow[]> {
  const conditions: SQL[] = [sql`user_id = ${userId}`];
  for (const f of spec.filters) conditions.push(filterClause(f));
  if (spec.dateFrom) conditions.push(sql`occurred_at >= ${spec.dateFrom}`);
  if (spec.dateTo) conditions.push(sql`occurred_at <= ${spec.dateTo}`);

  const whereClause = sql.join(conditions, sql` and `);
  const metric = metricExpression(spec.metric);
  const groupColumn = spec.groupBy ? columnFor(spec.groupBy) : null;

  const query = groupColumn
    ? sql`
        select ${groupColumn} as label, ${metric} as value
        from v_analytics_transactions
        where ${whereClause}
        group by ${groupColumn}
        order by value desc
        limit ${spec.limit}
      `
    : sql`
        select null as label, ${metric} as value
        from v_analytics_transactions
        where ${whereClause}
        limit ${spec.limit}
      `;

  const rows = await db.execute<{ label: string | null; value: string | number }>(query);
  return rows.map((r) => ({ label: r.label, value: Number(r.value) }));
}
