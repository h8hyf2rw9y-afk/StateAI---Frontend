import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

// Every route under here is per-user and auth-gated (see proxy.ts) — never
// statically prerender it, or a build-time snapshot could leak across users.
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
