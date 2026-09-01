import { describe, expect, it } from "vitest";
import { AuthError } from "@supabase/supabase-js";
import { getAuthErrorMessage, getAvatarUrl, getDisplayName } from "@/features/auth/lib";

describe("getAuthErrorMessage", () => {
  it("returns a generic message when there is no error", () => {
    expect(getAuthErrorMessage(null)).toMatch(/something went wrong/i);
  });

  it("maps invalid_credentials to friendly copy", () => {
    const error = new AuthError("Invalid login credentials", 400, "invalid_credentials");
    expect(getAuthErrorMessage(error)).toMatch(/doesn't look right/i);
  });

  it("maps user_already_exists to friendly copy", () => {
    const error = new AuthError("User already registered", 422, "user_already_exists");
    expect(getAuthErrorMessage(error)).toMatch(/already exists/i);
  });

  it("never leaks a raw network error message", () => {
    // Shaped like Supabase's AuthRetryableFetchError, without depending on
    // its exact constructor — see @supabase/auth-js/lib/errors.
    const networkError = Object.assign(new AuthError("Failed to fetch", undefined, undefined), {
      name: "AuthRetryableFetchError",
    });
    const message = getAuthErrorMessage(networkError);
    expect(message).not.toMatch(/failed to fetch/i);
    expect(message).toMatch(/couldn't reach the server/i);
  });

  it("falls back to Supabase's own message for an unmapped error code", () => {
    const error = new AuthError("Signups not allowed for this instance", 422, "signup_disabled");
    // signup_disabled is mapped, so this should NOT fall through to raw message.
    expect(getAuthErrorMessage(error)).toMatch(/sign-ups are currently disabled/i);
  });
});

describe("getDisplayName", () => {
  it("returns an empty string for no user", () => {
    expect(getDisplayName(null)).toBe("");
  });

  it("prefers first_name/last_name metadata (email/password sign-up)", () => {
    const user = { user_metadata: { first_name: "Jane", last_name: "Doe" }, email: "jane@example.com" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getDisplayName(user as any)).toBe("Jane Doe");
  });

  it("falls back to full_name metadata (Google OAuth)", () => {
    const user = { user_metadata: { full_name: "Jane Doe" }, email: "jane@example.com" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getDisplayName(user as any)).toBe("Jane Doe");
  });

  it("falls back to the email prefix when no name metadata exists", () => {
    const user = { user_metadata: {}, email: "jane@example.com" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getDisplayName(user as any)).toBe("jane");
  });
});

describe("getAvatarUrl", () => {
  it("returns undefined when there is no avatar (email/password accounts)", () => {
    const user = { user_metadata: {} };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getAvatarUrl(user as any)).toBeUndefined();
  });

  it("reads avatar_url from metadata (Google OAuth)", () => {
    const user = { user_metadata: { avatar_url: "https://example.com/a.png" } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getAvatarUrl(user as any)).toBe("https://example.com/a.png");
  });
});
