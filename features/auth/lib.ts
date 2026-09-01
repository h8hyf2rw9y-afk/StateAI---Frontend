import type { AuthError } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/**
 * Maps Supabase's typed auth error codes to copy that's safe and useful to
 * show a user — never the raw error, per the project's security rules.
 * Falls back to Supabase's own `message` for API error codes not
 * explicitly mapped below (those are already written to be end-user-safe —
 * e.g. "Signups not allowed for this instance" — unlike browser/network
 * -level failures, which are special-cased above because their message is
 * a raw string like "Failed to fetch").
 */
export function getAuthErrorMessage(error: AuthError | null | undefined): string {
  if (!error) return "Something went wrong. Please try again.";

  // Network/DNS/connection failures (e.g. Supabase unreachable, or not
  // configured yet) surface as AuthRetryableFetchError with a raw message
  // like "Failed to fetch" — never show that directly.
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  if (error.name === "AuthRetryableFetchError" || isOffline) {
    return "Couldn't reach the server. Check your connection and try again.";
  }

  switch (error.code) {
    case "invalid_credentials":
      return "That email or password doesn't look right. Please try again.";
    case "email_exists":
    case "user_already_exists":
      return "An account with that email already exists. Try signing in instead.";
    case "email_not_confirmed":
      return "Please confirm your email address before signing in — check your inbox for the confirmation link.";
    case "weak_password":
      return "That password is too weak. Use at least 8 characters, including a letter and a number.";
    case "email_address_invalid":
      return "Please enter a valid email address.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Please wait a moment and try again.";
    case "signup_disabled":
      return "Sign-ups are currently disabled. Please contact your organization admin.";
    case "captcha_failed":
      return "We couldn't verify you're human. Please try again.";
    default:
      return error.message || "Something went wrong. Please try again.";
  }
}

/** Best-effort "First Last" (or just first, or email prefix) for greeting/avatar UI, across both email/password and OAuth (Google) sign-ups. */
export function getDisplayName(user: User | null | undefined): string {
  if (!user) return "";

  const meta = user.user_metadata ?? {};
  const firstName = typeof meta.first_name === "string" ? meta.first_name : undefined;
  const lastName = typeof meta.last_name === "string" ? meta.last_name : undefined;
  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(" ");
  }

  // Google OAuth populates these instead of first_name/last_name.
  if (typeof meta.full_name === "string" && meta.full_name.trim()) return meta.full_name;
  if (typeof meta.name === "string" && meta.name.trim()) return meta.name;

  return user.email?.split("@")[0] ?? "there";
}

/** Google OAuth accounts have an avatar; email/password accounts don't — callers must handle undefined. */
export function getAvatarUrl(user: User | null | undefined): string | undefined {
  const meta = user?.user_metadata ?? {};
  return (
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    undefined
  );
}
