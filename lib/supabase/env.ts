/**
 * Supabase connection details for the browser.
 *
 * Naming note: Supabase's current dashboard calls this key the
 * "publishable key" (their newer term for the key that's always safe to
 * ship to the browser — it only ever grants what your Row Level Security
 * policies allow). Older Supabase projects/docs call the same kind of key
 * the "anon key". Both are the same *category* of key — never the
 * `service_role` key, which must never appear in frontend code — so
 * `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` accepts either one: paste your
 * project's publishable key if you have one, or its anon key otherwise.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const hasSupabaseEnvVars = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

/** Throws a clear setup error instead of the cryptic runtime crash a missing env var would otherwise cause. */
export function requireSupabaseEnvVars(): {
  url: string;
  publishableKey: string;
} {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Missing Supabase environment variables. Copy .env.example to .env.local and set " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — see README.md " +
        "for where to find them in the Supabase dashboard."
    );
  }
  return { url: SUPABASE_URL, publishableKey: SUPABASE_PUBLISHABLE_KEY };
}
