import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  PiggyBank,
  Repeat,
  HandCoins,
  Wand2,
  MessagesSquare,
  Settings,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/cards", label: "Cards", icon: CreditCard },
  { href: "/budgets", label: "Budgets", icon: PiggyBank },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/debts", label: "Debts", icon: HandCoins },
  { href: "/rules", label: "Rules", icon: Wand2 },
  { href: "/ask", label: "Ask", icon: MessagesSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];
