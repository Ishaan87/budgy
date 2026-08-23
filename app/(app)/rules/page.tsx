import { listRulesWithCategoryNames } from "@/lib/db/queries/rules";
import { listCategories } from "@/lib/db/queries/categories";
import { requireUserId } from "@/lib/supabase/server";
import { RuleFormDialog } from "@/components/rules/rule-form-dialog";
import { RuleList } from "@/components/rules/rule-list";

export default async function RulesPage() {
  const userId = await requireUserId();
  const [rules, categories] = await Promise.all([listRulesWithCategoryNames(userId), listCategories(userId)]);

  const categoryOptions = categories.filter((c) => c.kind === "expense").map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="max-w-3xl space-y-4 px-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rules</h1>
          <p className="text-muted-foreground">
            Auto-categorize natural-language entries — checked top to bottom, first match wins.
          </p>
        </div>
        <RuleFormDialog categories={categoryOptions} />
      </div>
      <RuleList rows={rules} categories={categoryOptions} />
    </div>
  );
}
