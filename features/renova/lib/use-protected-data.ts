"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getRevealErrorMessage } from "@/features/renova/lib/errors";
import type { RenovaSensitiveData } from "@/features/renova/types";
import { getRenovaSensitiveData } from "@/lib/api/renova";

/** How long the full values stay visible before they are hidden again. */
export const REVEAL_DURATION_MS = 60_000;

export type ProtectedDataState =
  | { status: "hidden" }
  | { status: "confirming" }
  | { status: "loading" }
  | { status: "revealed"; values: RenovaSensitiveData }
  | { status: "error"; message: string };

export interface ProtectedData {
  state: ProtectedDataState;
  /** The full values while revealed, otherwise null. */
  values: RenovaSensitiveData | null;
  /** Step 1: ask for confirmation. Nothing is fetched yet. */
  requestReveal: () => void;
  /** Step 2: after the person confirms, fetch the values from the audited endpoint. */
  confirmReveal: () => Promise<void>;
  /** Back out of the confirmation / dismiss an error. */
  cancel: () => void;
  /** Immediately drop the full values from memory. */
  hide: () => void;
}

/**
 * Temporary, in-memory reveal of a case's NSS and número de crédito.
 *
 *  - Nothing is loaded until the person confirms; values are never prefetched.
 *  - The values live ONLY in this hook's state: no localStorage, sessionStorage,
 *    URL, analytics or console. They are dropped on `hide()`, after
 *    REVEAL_DURATION_MS, and when the component using the hook unmounts (closing
 *    the dialog or leaving the page).
 *  - A late response (the person hid it or left while it was loading) is ignored.
 */
export function useProtectedData(caseId: string | undefined): ProtectedData {
  const [state, setState] = useState<ProtectedDataState>({ status: "hidden" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped whenever the values must be discarded, so an in-flight request can tell it is stale.
  const generation = useRef(0);

  const clearTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const hide = useCallback(() => {
    generation.current += 1;
    clearTimer();
    setState({ status: "hidden" });
  }, [clearTimer]);

  useEffect(
    () => () => {
      generation.current += 1;
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const requestReveal = useCallback(() => setState({ status: "confirming" }), []);

  const confirmReveal = useCallback(async () => {
    if (!caseId) return;
    const mine = ++generation.current;
    clearTimer();
    setState({ status: "loading" });
    const response = await getRenovaSensitiveData(caseId);
    if (mine !== generation.current) return;
    if (!response.ok) {
      setState({ status: "error", message: getRevealErrorMessage(response.error) });
      return;
    }
    setState({ status: "revealed", values: response.data });
    timer.current = setTimeout(() => {
      generation.current += 1;
      timer.current = null;
      setState({ status: "hidden" });
    }, REVEAL_DURATION_MS);
  }, [caseId, clearTimer]);

  return {
    state,
    values: state.status === "revealed" ? state.values : null,
    requestReveal,
    confirmReveal,
    cancel: hide,
    hide,
  };
}
