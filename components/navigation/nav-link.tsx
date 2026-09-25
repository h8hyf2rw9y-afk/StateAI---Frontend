"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Kanban,
  ListTodo,
  CalendarClock,
  Sparkles,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NavIconName, NavItem } from "./nav-config";
import { cn } from "@/lib/utils";

/** Resolved on the client, where importing lucide-react directly is safe — see the note on NAV_ITEMS in nav-config.ts. */
const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  leads: Users,
  properties: Building2,
  pipeline: Kanban,
  tasks: ListTodo,
  appointments: CalendarClock,
  "ai-assistant": Sparkles,
  settings: Settings,
};

interface NavLinkProps {
  item: NavItem;
  onNavigate?: () => void;
}

/** A single primary-nav entry that highlights itself when its route is active. */
export function NavLink({ item, onNavigate }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
  const Icon = NAV_ICONS[item.icon];

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "text-muted-foreground hover:translate-x-0.5 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      )}
    >
      {isActive && (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
      )}
      <Icon
        className={cn("size-4 shrink-0 transition-colors", isActive ? "text-primary" : "group-hover:text-foreground")}
        aria-hidden="true"
      />
      {item.label}
    </Link>
  );
}
