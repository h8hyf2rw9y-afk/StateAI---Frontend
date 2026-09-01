import type { ApiResult } from "@/types/api";

/**
 * Base URL of the future FastAPI backend, injected at build time.
 *
 * NEXT_PUBLIC_API_URL is the only piece of backend configuration the
 * frontend is allowed to know about. It is never a secret — do not add
 * API keys, service-role tokens, or anything else sensitive here. Real
 * authorization is enforced by the backend, not by this client.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Extra query params appended to the URL. */
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
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
  const { method = "GET", body, params, signal } = options;

  try {
    const response = await fetch(buildUrl(path, params), {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // Auth will eventually be a bearer token or cookie set by the
      // backend/Supabase session — not implemented yet.
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });

    if (!response.ok) {
      let message = response.statusText || "Request failed";
      try {
        const payload = await response.json();
        message = payload?.message ?? message;
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
    return {
      ok: false,
      error: {
        message:
          error instanceof Error ? error.message : "Network request failed",
      },
    };
  }
}
