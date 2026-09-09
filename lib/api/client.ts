import type { ApiResult } from "@/types/api";
import { createClient } from "@/lib/supabase/client";

/**
 * Base URL of the FastAPI backend, injected at build time.
 *
 * NEXT_PUBLIC_API_URL is the only piece of backend configuration the
 * frontend is allowed to know about. It is never a secret — do not add
 * API keys, service-role tokens, or anything else sensitive here. Real
 * authorization is enforced by the backend, not by this client.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Every other call site gets this — fine for the CRUD-ish endpoints in this file's sibling modules. */
const DEFAULT_TIMEOUT_MS = 30_000;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Extra query params appended to the URL. */
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  /**
   * Milliseconds before this request is aborted client-side. Defaults to
   * 30s. Real AI-agent calls (lib/api/ai.ts) run local inference that can
   * legitimately take 1-3+ minutes on CPU-only hardware — those pass a much
   * larger value here so the frontend never cancels a request the backend
   * is still working on well before the backend's own timeout
   * (OLLAMA_TIMEOUT_SECONDS) would.
   */
  timeoutMs?: number;
}

function buildUrl(path: string, params?: RequestOptions["params"]): string {
  const url = new URL(path.replace(/^\//, ""), `${API_BASE_URL}/`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * The current Supabase session's access token, as an Authorization header —
 * or `{}` when signed out. Only ever the standard Supabase-managed session
 * (via the browser client's cookies, same as hooks/useUser.ts), never a
 * second, hand-rolled auth mechanism, and never anything read from
 * localStorage. This is why apiRequest only works from Client Components:
 * `createClient()` (lib/supabase/client.ts) is browser-only, matching every
 * real caller today (the AI panels are all "use client").
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

/**
 * Thin fetch wrapper shared by every domain module in lib/api/.
 *
 * It never throws — callers get back a discriminated ApiResult so UI code
 * can render loading/error/success states without try/catch everywhere.
 * This is the single seam the whole app talks to the backend through;
 * nothing outside lib/api/ should call fetch() against the API directly.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResult<T>> {
  const { method = "GET", body, params, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  // Aborts the request client-side after timeoutMs, combined with any
  // caller-supplied signal — never an infinite wait, but never shorter than
  // what the caller asked for either.
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) timeoutController.abort();
    else signal.addEventListener("abort", () => timeoutController.abort(), { once: true });
  }

  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(buildUrl(path, params), {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...authHeaders,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: timeoutController.signal,
    });

    if (!response.ok) {
      let message = response.statusText || "Request failed";
      try {
        const payload = await response.json();
        message = payload?.detail ?? payload?.message ?? message;
      } catch {
        // Response had no JSON body — fall back to statusText.
      }
      return {
        ok: false,
        error: { message, status: response.status },
      };
    }

    if (response.status === 204) {
      return { ok: true, data: undefined as T };
    }

    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      const wasExternallyCancelled = signal?.aborted ?? false;
      return {
        ok: false,
        error: {
          message: wasExternallyCancelled
            ? "Request cancelled."
            : "The request took too long and was cancelled. Please try again.",
          code: "timeout",
        },
      };
    }
    return {
      ok: false,
      error: {
        message:
          error instanceof Error ? error.message : "Network request failed",
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
