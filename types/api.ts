/**
 * Generic shapes for the future FastAPI backend contract.
 * Keeping these separate from feature types means the API client stays
 * typed even before real endpoints exist.
 */

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Discriminated result type used by lib/api so callers must handle failure. */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };
