import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Tables live in the `public` schema only. Row Level Security, foreign keys into
 * `auth.users`, views, and trigger functions are hand-written in
 * lib/db/migrations/0001_rls_views_functions.sql — see that file and SETUP.md for why
 * this is split from the drizzle-generated table migration.
 */

export const accountTypeEnum = pgEnum("account_type", [
  "cash",
  "bank",
  "wallet",
  "credit_card",
  "investment",
]);

export const categoryKindEnum = pgEnum("category_kind", ["expense", "income"]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "expense",
  "income",
  "transfer",
]);

export const transactionSourceEnum = pgEnum("transaction_source", [
  "manual",
  "nl",
  "bulk_nl",
  "import",
  "recurring",
]);

export const recurringFrequencyEnum = pgEnum("recurring_frequency", [
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

export const debtDirectionEnum = pgEnum("debt_direction", ["owed_to_me", "i_owe"]);

export const debtEntryTypeEnum = pgEnum("debt_entry_type", ["lend", "borrow", "repayment"]);

export const ruleCreatedFromEnum = pgEnum("rule_created_from", ["manual", "learned"]);

export const llmProviderEnum = pgEnum("llm_provider", ["openrouter", "gemini", "huggingface"]);

export const llmModelStatusEnum = pgEnum("llm_model_status", ["ok", "cooldown", "disabled"]);

export const llmCallPurposeEnum = pgEnum("llm_call_purpose", [
  "nl_parse",
  "nl_parse_bulk",
  "nl_analytics_query",
  "nl_analytics_answer",
  "repair",
]);

export const profiles = pgTable("profiles", {
  // References auth.users(id) — FK constraint added in the hand-written migration.
  id: uuid("id").primaryKey(),
  displayName: text("display_name"),
  baseCurrency: text("base_currency").notNull().default("INR"),
  locale: text("locale").notNull().default("en-IN"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),
    openingBalance: numeric("opening_balance", { precision: 14, scale: 2 }).notNull().default("0"),
    creditLimit: numeric("credit_limit", { precision: 14, scale: 2 }),
    statementDay: smallint("statement_day"),
    dueDay: smallint("due_day"),
    icon: text("icon"),
    color: text("color"),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

export const accountAliases = pgTable(
  "account_aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("account_aliases_user_id_idx").on(table.userId),
    uniqueIndex("account_aliases_user_alias_idx").on(table.userId, table.alias),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    kind: categoryKindEnum("kind").notNull(),
    icon: text("icon"),
    color: text("color"),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("categories_user_id_idx").on(table.userId),
    index("categories_parent_id_idx").on(table.parentId),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: transactionTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    toAccountId: uuid("to_account_id").references(() => accounts.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    merchant: text("merchant"),
    note: text("note"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    source: transactionSourceEnum("source").notNull().default("manual"),
    rawInput: text("raw_input"),
    llmMeta: jsonb("llm_meta"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("transactions_user_id_idx").on(table.userId),
    index("transactions_account_id_idx").on(table.accountId),
    index("transactions_category_id_idx").on(table.categoryId),
    index("transactions_occurred_at_idx").on(table.occurredAt),
    index("transactions_user_occurred_idx").on(table.userId, table.occurredAt),
  ],
);

export const transactionSplits = pgTable(
  "transaction_splits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    note: text("note"),
  },
  (table) => [index("transaction_splits_transaction_id_idx").on(table.transactionId)],
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    effectiveFrom: date("effective_from").notNull(),
    rollover: boolean("rollover").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("budgets_user_id_idx").on(table.userId),
    uniqueIndex("budgets_user_category_month_idx").on(
      table.userId,
      table.categoryId,
      table.effectiveFrom,
    ),
  ],
);

export const recurringRules = pgTable(
  "recurring_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    type: transactionTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    toAccountId: uuid("to_account_id").references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    merchant: text("merchant"),
    note: text("note"),
    frequency: recurringFrequencyEnum("frequency").notNull(),
    interval: integer("interval").notNull().default(1),
    dayOfMonth: smallint("day_of_month"),
    weekday: smallint("weekday"),
    nextRunOn: date("next_run_on").notNull(),
    endOn: date("end_on"),
    autoPost: boolean("auto_post").notNull().default(true),
    lastPostedOn: date("last_posted_on"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("recurring_rules_user_id_idx").on(table.userId),
    index("recurring_rules_next_run_on_idx").on(table.nextRunOn),
  ],
);

export const debts = pgTable(
  "debts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    counterparty: text("counterparty").notNull(),
    direction: debtDirectionEnum("direction").notNull(),
    note: text("note"),
    isSettled: boolean("is_settled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("debts_user_id_idx").on(table.userId)],
);

export const debtEntries = pgTable(
  "debt_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    debtId: uuid("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    type: debtEntryTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    note: text("note"),
    transactionId: uuid("transaction_id").references(() => transactions.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("debt_entries_debt_id_idx").on(table.debtId),
    index("debt_entries_user_id_idx").on(table.userId),
  ],
);

export const rules = pgTable(
  "rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    priority: integer("priority").notNull().default(0),
    match: jsonb("match").notNull(),
    set: jsonb("set").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    hitCount: integer("hit_count").notNull().default(0),
    createdFrom: ruleCreatedFromEnum("created_from").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("rules_user_id_idx").on(table.userId),
    index("rules_user_priority_idx").on(table.userId, table.priority),
  ],
);

export const llmCredentials = pgTable(
  "llm_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    provider: llmProviderEnum("provider").notNull(),
    label: text("label").notNull(),
    ciphertext: text("ciphertext").notNull(),
    iv: text("iv").notNull(),
    authTag: text("auth_tag").notNull(),
    keyLast4: text("key_last4").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("llm_credentials_user_id_idx").on(table.userId)],
);

export const llmChain = pgTable(
  "llm_chain",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    priority: integer("priority").notNull(),
    provider: llmProviderEnum("provider").notNull(),
    model: text("model").notNull(),
    credentialId: uuid("credential_id")
      .notNull()
      .references(() => llmCredentials.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("llm_chain_user_id_idx").on(table.userId),
    uniqueIndex("llm_chain_user_priority_idx").on(table.userId, table.priority),
  ],
);

export const llmModelState = pgTable(
  "llm_model_state",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    chainId: uuid("chain_id")
      .notNull()
      .references(() => llmChain.id, { onDelete: "cascade" }),
    status: llmModelStatusEnum("status").notNull().default("ok"),
    cooldownUntil: timestamp("cooldown_until", { withTimezone: true }),
    lastError: text("last_error"),
    callCount: integer("call_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    estCostUsd: numeric("est_cost_usd", { precision: 10, scale: 4 }).notNull().default("0"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("llm_model_state_user_id_idx").on(table.userId),
    uniqueIndex("llm_model_state_chain_id_idx").on(table.chainId),
  ],
);

export const llmCallLog = pgTable(
  "llm_call_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    chainId: uuid("chain_id").references(() => llmChain.id, { onDelete: "set null" }),
    purpose: llmCallPurposeEnum("purpose").notNull(),
    provider: llmProviderEnum("provider"),
    model: text("model"),
    ok: boolean("ok").notNull(),
    errorCode: text("error_code"),
    latencyMs: integer("latency_ms"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("llm_call_log_user_id_idx").on(table.userId),
    index("llm_call_log_created_at_idx").on(table.createdAt),
  ],
);

export const nlParseCache = pgTable(
  "nl_parse_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    inputHash: text("input_hash").notNull(),
    rawInput: text("raw_input").notNull(),
    result: jsonb("result").notNull(),
    modelUsed: text("model_used"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("nl_parse_cache_user_hash_idx").on(table.userId, table.inputHash)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    tableName: text("table_name").notNull(),
    recordId: uuid("record_id").notNull(),
    action: text("action").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_log_user_id_idx").on(table.userId),
    index("audit_log_record_id_idx").on(table.recordId),
  ],
);
