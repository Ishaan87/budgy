"use client";

import { ArchiveToggleButton } from "@/components/archive-toggle-button";
import { archiveAccount, archiveCategory } from "./actions";

export function AccountArchiveButton({ id, isArchived }: { id: string; isArchived: boolean }) {
  return <ArchiveToggleButton isArchived={isArchived} onToggle={(next) => archiveAccount(id, next)} />;
}

export function CategoryArchiveButton({ id, isArchived }: { id: string; isArchived: boolean }) {
  return <ArchiveToggleButton isArchived={isArchived} onToggle={(next) => archiveCategory(id, next)} />;
}
