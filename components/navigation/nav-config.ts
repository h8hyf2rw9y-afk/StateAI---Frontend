export type NavIconName =
  | "dashboard"
  | "leads"
  | "properties"
  | "pipeline"
  | "tasks"
  | "appointments"
  | "ai-assistant"
  | "settings";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIconName;
  group: "workspace" | "organize" | "system";
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
  { label: "Settings", href: "/settings", icon: "settings", group: "system" },
];
