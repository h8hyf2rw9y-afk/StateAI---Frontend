import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Reads the session on every request — never statically prerender this.
export const dynamic = "force-dynamic";

/**
 * proxy.ts doesn't protect "/" itself (see PROTECTED_PREFIXES in
 * lib/supabase/proxy.ts), so this checks auth directly rather than always
 * bouncing through /dashboard and relying on proxy.ts to redirect a second
 * time when signed out.
 */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
