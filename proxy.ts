import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 renamed Middleware to Proxy (same file convention, same
 * request/response API) — this is that file. All the actual logic lives in
 * lib/supabase/proxy.ts so it can be unit-tested and reused independently
 * of this entry point.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every route except static assets and image optimization
     * files — those never need a session check and re-running Supabase's
     * cookie refresh on them would only add latency.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
