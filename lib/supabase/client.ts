import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseEnvVars } from "./env";

/**
 * Supabase client for Client Components / the browser. Only ever
 * constructed with the publishable/anon key — never a secret — and reads
 * and writes the session via cookies (not localStorage) so the server can
 * see the same session. See lib/supabase/server.ts for the server-side
 * counterpart and lib/supabase/proxy.ts for how the session is refreshed.
 */
export function createClient() {
  const { url, publishableKey } = requireSupabaseEnvVars();
  return createBrowserClient(url, publishableKey);
}
