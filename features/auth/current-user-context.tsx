"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMe, type CurrentUser } from "@/lib/api/me";
import type { ApiError } from "@/types/api";

interface CurrentUserState {
  /** The backend's view of the caller (role, organization) — null until loaded or on error. */
  me: CurrentUser | null;
  error: ApiError | null;
  isLoading: boolean;
}

const CurrentUserContext = createContext<CurrentUserState>({ me: null, error: null, isLoading: true });

/**
 * Loads GET /me once for the whole signed-in shell, so the sidebar, the
 * header and the pages agree on one role instead of each asking on its own.
 */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CurrentUserState>({ me: null, error: null, isLoading: true });

  useEffect(() => {
    let cancelled = false;
    getMe().then((response) => {
      if (cancelled) return;
      setState(
        response.ok
          ? { me: response.data, error: null, isLoading: false }
          : { me: null, error: response.error, isLoading: false }
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <CurrentUserContext.Provider value={state}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUserState {
  return useContext(CurrentUserContext);
}
