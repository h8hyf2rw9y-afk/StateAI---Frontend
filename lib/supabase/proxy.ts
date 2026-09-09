import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnvVars, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/** Routes that require a signed-in session. Sub-paths (e.g. /leads/123) are protected too. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/leads",
  "/properties",
  "/pipeline",
  "/tasks",
  "/appointments",
  "/ai-assistant",
  "/settings",
];

/** Signed-in users shouldn't linger on these — bounce them to /dashboard instead. */
const AUTH_ONLY_ROUTES = ["/login", "/register"];

/**
 * Refreshes the Supabase session on every request and enforces route
 * protection at the edge, before any page renders. This is the *first*
 * line of defense (an "optimistic" check, in Next.js's terms) — it keeps
 * signed-out users from ever seeing protected UI, but it is not the final
 * security boundary. Once the FastAPI backend exists, it must independently
 * verify the user's Supabase JWT on every request; nothing here should be
 * trusted as authorization by itself.
 *
 * Adapted from Supabase's official Next.js Proxy/Middleware template
 * (https://supabase.com/docs/guides/auth/server-side/nextjs) — the cookie
 * relay dance (getAll/setAll, rebuilding NextResponse.next() so cookies
 * land on both the request Supabase reads and the response the browser
 * gets) must stay intact or sessions will randomly drop.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Without env vars configured yet, don't block the app — every protected
  // page will still 500 loudly when it tries to use a Supabase client, but
  // at least routing itself doesn't break before Supabase is set up.
  if (!hasSupabaseEnvVars) {
    return supabaseResponse;
  }

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Do not add code between createServerClient and getClaims(): this call
  // is what actually refreshes an expired session. Skipping or delaying it
  // is a common way to end up with users randomly signed out.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const isAuthOnlyRoute = AUTH_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthOnlyRoute && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Must return supabaseResponse as-is (or copy its cookies onto a new
  // response) — constructing a fresh NextResponse here without doing so
  // silently drops the refreshed session cookies.
  return supabaseResponse;
}
