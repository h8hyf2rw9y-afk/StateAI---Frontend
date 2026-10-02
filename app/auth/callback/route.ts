import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth (and email-link) callback. Supabase redirects the browser here with
 * a one-time `code` after the user authenticates with the provider (e.g.
 * Google); this route exchanges it server-side for a session, which is
 * written to cookies via lib/supabase/server.ts. The access/refresh tokens
 * never pass through the URL or client-side JS.
 *
 * `next` lets a caller send the user somewhere other than /dashboard after
 * login (not currently used by the UI, but kept since it's the standard,
 * safe way to support "continue where you left off" later) — it's
 * constrained to same-origin relative paths so it can't be used as an open
 * redirect.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const inviteToken = searchParams.get("invite");
  let next = searchParams.get("next") ?? "/dashboard";
  if (!next.startsWith("/")) {
    next = "/dashboard";
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Idempotent onboarding — same call LoginForm makes on every real
      // login (see lib/api/me.ts), just from a server context: this is
      // the one place a session goes active (Google OAuth, or an email
      // confirmation link that signs the user straight in) without ever
      // touching LoginForm. apiRequest itself is browser-only, so this
      // uses the session this route already just created directly rather
      // than that shared helper. Best-effort: a failure here isn't shown
      // as a login error — the dashboard's own real-data loading already
      // surfaces a clear error state if the account still isn't
      // provisioned, so this never silently strands the user.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
        // An invite token (set by RegisterForm/GoogleButton, only ever
        // after confirming the link was still valid) joins the inviter's
        // EXISTING organization; everyone else gets the normal
        // self-service "create my own" path. If joining fails here (the
        // link died in the meantime — someone else just used it, it
        // expired mid-flow), fall back to provisioning a new organization
        // rather than stranding a real, already-created account with none
        // at all.
        const joined = inviteToken
          ? await fetch(`${apiBaseUrl}/api/v1/me/organization/join`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ token: inviteToken }),
            })
              .then((res) => res.ok)
              .catch(() => false)
          : false;
        if (!joined) {
          await fetch(`${apiBaseUrl}/api/v1/me/organization`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: "{}",
          }).catch(() => {});
        }
      }

      // Behind a load balancer/proxy (e.g. in production), prefer the
      // original host so the redirect doesn't point at an internal address.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv || !forwardedHost) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      return NextResponse.redirect(`https://${forwardedHost}${next}`);
    }
  }

  // Don't leak provider/exchange error details into the URL or UI — just
  // send the user back to login with a generic, safe error flag.
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", "oauth_failed");
  return NextResponse.redirect(loginUrl);
}
