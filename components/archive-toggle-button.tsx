"use client";

import { useTransition } from "react";
import { ArchiveRestore, Archive } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ArchiveToggleButton({
  isArchived,
  onToggle,
}: {
  isArchived: boolean;
  onToggle: (next: boolean) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await onToggle(!isArchived);
            toast.success(isArchived ? "Restored" : "Archived");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Something went wrong");
          }
        })
      }
    >
      {isArchived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
    </Button>
  );
}
