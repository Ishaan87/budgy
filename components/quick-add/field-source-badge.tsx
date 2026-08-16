import { Badge } from "@/components/ui/badge";
import type { FieldSource } from "@/lib/nl/schemas";

const LABEL: Record<FieldSource, string> = {
  rule: "from rule",
  parsed: "parsed",
  llm: "AI",
  default: "default",
};

const VARIANT: Record<FieldSource, "secondary" | "outline"> = {
  rule: "secondary",
  parsed: "outline",
  llm: "secondary",
  default: "outline",
};

export function FieldSourceBadge({ source }: { source?: FieldSource }) {
  if (!source) return null;
  return (
    <Badge variant={VARIANT[source]} className="text-[0.6rem] font-normal">
      {LABEL[source]}
    </Badge>
  );
}
