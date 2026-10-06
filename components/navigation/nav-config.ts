import type { UserRole } from "@/types/user";
import { isRenovaOnly } from "@/features/auth/access";

export type NavIconName =
  | "dashboard"
  | "leads"
  | "properties"
  | "pipeline"
  | "tasks"
  | "appointments"
  | "ai-assistant"
  | "admin"
  | "settings";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIconName;
  group: "workspace" | "organize" | "system";
  /** Only these roles see the entry (omitted: every role except a Renova-only advisor). */
  roles?: UserRole[];
}

/**
 * Single source of truth for the primary product navigation. Both the
 * desktop sidebar and the mobile nav sheet render from this list, so adding
 * a new top-level section only ever means editing this file.
 *
 * `icon` is a name, not a component reference: NAV_ITEMS is read by the
 * (Server Component) AppSidebar and passed as a prop into NavLink (a Client
 * Component). A Lucide icon is a forwardRef component — passing the
 * component itself across that boundary fails at build time ("Functions
 * cannot be passed directly to Client Components"). NavLink resolves the
 * name to a component locally instead.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard", group: "workspace" },
  { label: "Leads", href: "/leads", icon: "leads", group: "workspace" },
  { label: "Properties", href: "/properties", icon: "properties", group: "workspace" },
  { label: "Pipeline", href: "/pipeline", icon: "pipeline", group: "workspace" },
  { label: "Tasks", href: "/tasks", icon: "tasks", group: "organize" },
  { label: "Appointments", href: "/appointments", icon: "appointments", group: "organize" },
  { label: "AI Assistant", href: "/ai-assistant", icon: "ai-assistant", group: "system" },
  { label: "Administración", href: "/admin", icon: "admin", group: "system", roles: ["owner", "admin"] },
  { label: "Settings", href: "/settings", icon: "settings", group: "system" },
];

/**
 * The entries a role actually gets. A Renova-only advisor sees just their
 * Renova workspace and Settings — the backend refuses every other section
 * to them anyway (see features/auth/access.ts).
 */
export function navItemsFor(role: UserRole | undefined): NavItem[] {
  if (!role) return [];
  if (isRenovaOnly(role)) {
    return [
      { label: "Renova", href: "/leads?view=renova", icon: "leads", group: "workspace" },
      { label: "Settings", href: "/settings", icon: "settings", group: "system" },
    ];
  }
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}
