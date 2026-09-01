"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export interface UseUserResult {
  /** The Supabase auth user, or null when signed out. */
  user: User | null;
  /** True until the first auth state is known — use this to avoid a flash of signed-out UI. */
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * Client-side hook for reading the current Supabase session reactively —
 * the UI abstraction requested for "does the app know if the user is
 * authenticated." It intentionally does not do its own routing/redirects;
 * that's proxy.ts's job (see lib/supabase/proxy.ts), which runs before any
 * page renders and is the actual access-control boundary. This hook is for
 * *displaying* who's signed in (e.g. the user menu), not for protecting
 * anything.
 *
 * Built on `onAuthStateChange` rather than a one-off `getUser()` call so
 * the UI updates immediately on sign-in, sign-out, and token refresh —
 * without a separate global state library.
 */
export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, isLoading, isAuthenticated: user !== null };
}
