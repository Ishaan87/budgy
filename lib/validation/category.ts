import { z } from "zod";

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  kind: z.enum(["expense", "income"]),
  parentId: z.string().uuid().optional().nullable(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
