import { z } from "zod";
import { splitsMatchTotal } from "@/lib/money";

export const TRANSACTION_TYPES = ["expense", "income", "transfer"] as const;

const splitSchema = z.object({
  categoryId: z.string().uuid().nullable(),
  amount: z.coerce.number().positive(),
  note: z.string().optional(),
});

export const transactionFormSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    accountId: z.string().uuid("Choose an account"),
    toAccountId: z.string().uuid().optional().nullable(),
    categoryId: z.string().uuid().optional().nullable(),
    occurredAt: z.coerce.date(),
    merchant: z.string().trim().max(120).optional(),
    note: z.string().trim().max(500).optional(),
    tags: z.array(z.string().trim().min(1)).default([]),
    splits: z.array(splitSchema).default([]),
  })
  .refine((data) => data.type !== "transfer" || !!data.toAccountId, {
    message: "Choose a destination account for transfers",
    path: ["toAccountId"],
  })
  .refine((data) => data.type !== "transfer" || data.toAccountId !== data.accountId, {
    message: "Source and destination accounts must differ",
    path: ["toAccountId"],
  })
  .refine((data) => data.type === "transfer" || data.categoryId != null || data.splits.length > 0, {
    message: "Choose a category",
    path: ["categoryId"],
  })
  .refine(
    (data) => data.splits.length === 0 || splitsMatchTotal(data.amount, data.splits.map((s) => s.amount)),
    { message: "Splits must add up to the transaction amount", path: ["splits"] },
  );

export type TransactionFormValues = z.output<typeof transactionFormSchema>;
export type TransactionFormInput = z.input<typeof transactionFormSchema>;

export const transactionFiltersSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
