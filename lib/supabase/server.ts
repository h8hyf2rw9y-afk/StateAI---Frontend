import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseEnvVars } from "./env";

/**
 * Supabase client for Server Components, Server Actions, and Route
 * Handlers. Reads the session from the incoming request's cookies.
 *
 * Important: create a fresh client on every call rather than caching one
 * in a module-level variable — Server Components can run concurrently for
 * different users/requests, and a shared client would leak one user's
 * cookies into another's request.
 *
 * `setAll` can be called from a Server Component, where Next.js disallows
 * writing cookies — that's expected and safe to ignore here because
 * proxy.ts refreshes the session on every request before this ever runs.
 */
export async function createClient() {
  const { url, publishableKey } = requireSupabaseEnvVars();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — safe to ignore, see above.
        }
      },
    },
  });
}
