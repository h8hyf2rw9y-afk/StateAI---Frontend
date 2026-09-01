"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Kanban,
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
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  );
}
