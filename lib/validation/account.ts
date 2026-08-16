import { z } from "zod";

export const ACCOUNT_TYPES = ["cash", "bank", "wallet", "credit_card", "investment"] as const;

export const accountFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80),
    type: z.enum(ACCOUNT_TYPES),
    openingBalance: z.coerce.number().finite(),
    creditLimit: z.coerce.number().finite().positive().optional().nullable(),
    statementDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
    dueDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
    icon: z.string().optional(),
    color: z.string().optional(),
  })
  .refine(
    (data) =>
      data.type !== "credit_card" ||
      (data.creditLimit != null && data.statementDay != null && data.dueDay != null),
    {
      message: "Credit cards need a limit, statement day, and due day",
      path: ["creditLimit"],
    },
  );

export type AccountFormValues = z.output<typeof accountFormSchema>;
export type AccountFormInput = z.input<typeof accountFormSchema>;
