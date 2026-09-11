import type { ReactNode } from "react";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

/**
 * The public website — everything a visitor can see before signing in.
 * Intentionally its own route group, separate from app/(dashboard)/'s
 * DashboardShell (sidebar + topbar) and app/(auth)/'s centered card shell:
 * this is a scrolling marketing experience, not an app surface, and
 * shouldn't inherit either of those layouts or their `force-dynamic`
 * per-user rendering — these pages are the same for every visitor and can
 * be prerendered.
 *
 * Not auth-gated (proxy.ts's PROTECTED_PREFIXES doesn't include any of
 * these routes) and deliberately not auth-redirected either: a signed-in
 * visitor who lands on "/" still sees the real marketing site, the same
 * way apple.com or linear.app don't bounce a signed-in user away from
 * their own homepage. MarketingNav reads the session client-side (see its
 * own doc comment) only to swap its own CTA, never to block rendering.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
