import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __budgySql: ReturnType<typeof postgres> | undefined;
  var __budgyDb: PostgresJsDatabase<typeof schema> | undefined;
}

/**
 * Lazily initialized so importing this module never fails at build time (Next.js collects
 * page/route data by evaluating modules without a real DATABASE_URL present). The connection
 * is only opened the first time a query actually runs, at request time.
 */
function getDb(): PostgresJsDatabase<typeof schema> {
  if (globalThis.__budgyDb) return globalThis.__budgyDb;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. See SETUP.md.");
  }

  const sql = globalThis.__budgySql ?? postgres(process.env.DATABASE_URL, { prepare: false });
  if (process.env.NODE_ENV !== "production") globalThis.__budgySql = sql;

  const instance = drizzle(sql, { schema });
  if (process.env.NODE_ENV !== "production") globalThis.__budgyDb = instance;
  return instance;
}

export const db: PostgresJsDatabase<typeof schema> = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
