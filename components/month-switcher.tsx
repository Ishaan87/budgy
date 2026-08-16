"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MonthSwitcher({ month }: { month: Date }) {
  const router = useRouter();
  const pathname = usePathname();

  function go(delta: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    router.push(`${pathname}?month=${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon-sm" onClick={() => go(-1)}>
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-32 text-center font-medium">
        {month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
      </span>
      <Button variant="outline" size="icon-sm" onClick={() => go(1)}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
