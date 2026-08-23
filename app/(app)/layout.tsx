import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { QuickAddDialog } from "@/components/quick-add/quick-add-dialog";
import { OfflineSync } from "@/components/offline-sync";
import { ThemeToggle } from "@/components/theme-toggle";
import { listAccountsWithBalances } from "@/lib/db/queries/accounts";
import { listCategories } from "@/lib/db/queries/categories";
import { requireUserId } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await requireUserId();
  const [accounts, categories] = await Promise.all([
    listAccountsWithBalances(userId),
    listCategories(userId),
  ]);
  const accountOptions = accounts.filter((a) => !a.isArchived).map((a) => ({ id: a.id, name: a.name }));
  const categoryOptions = categories
    .filter((c) => !c.isArchived)
    .map((c) => ({ id: c.id, name: c.name, kind: c.kind }));

  return (
    <div className="flex min-h-screen w-full">
      <aside className="hidden w-60 shrink-0 border-r md:flex md:flex-col">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            BUDGY
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AppSidebar />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <MobileNav />
            <Link href="/" className="text-lg font-semibold tracking-tight md:hidden">
              BUDGY
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <OfflineSync />
            <QuickAddDialog accounts={accountOptions} categories={categoryOptions} />
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
