import type { UserRole } from "@/types/user";

/**
 * What each role may open in the app. The backend is the real boundary
 * (a renova_agent gets 403 from every non-Renova route, and only its own
 * cases from Renova) — this only keeps the UI from offering what would fail.
 */

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Administrador supremo",
  admin: "Administrador",
  agent: "Agente CRM",
  renova_agent: "Asesor Retify",
};

export function isRenovaOnly(role: UserRole | undefined): boolean {
  return role === "admin" || role === "renova_agent";
}

/** Only advisors are case-scoped; owner, admin and legacy CRM agents can review the Retify team. */
export function isRetifyAdvisor(role: UserRole | undefined): boolean {
  return role === "renova_agent";
}

export function canManageTeam(role: UserRole | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** Where a role lands when it opens something it can't use. */
export function homePathFor(role: UserRole): string {
  return isRenovaOnly(role) ? "/leads?view=renova" : "/dashboard";
}

const RENOVA_ONLY_PATHS = ["/leads", "/pipeline", "/retify", "/settings"];

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPathAllowed(role: UserRole, pathname: string): boolean {
  if (matches(pathname, "/admin")) return canManageTeam(role);
  if (isRenovaOnly(role)) {
    // Inside Leads and Pipeline the workspaces force the Retify view, so a
    // manually edited query string can never expose the traditional CRM.
    if (matches(pathname, "/leads")) return pathname === "/leads" || matches(pathname, "/leads/renova");
    return RENOVA_ONLY_PATHS.some((prefix) => matches(pathname, prefix));
  }
  return true;
}
