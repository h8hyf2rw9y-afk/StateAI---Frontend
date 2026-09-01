"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.7 0-14.4 4.3-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-2.1 14.1-5.6l-6.5-5.5C29.6 34.5 26.9 35.5 24 35.5c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.5 5.5C41.2 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

/**
 * Self-contained "Continue with Google" button: it starts the Supabase
 * OAuth redirect itself (login and register need identical behavior), and
 * only surfaces its own network/setup errors — provider-side auth errors
 * come back through app/auth/callback/route.ts as a redirect, not here.
 */
export function GoogleButton({ onError }: { onError?: (message: string) => void }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    onError?.("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    // On success the browser is redirected away by Supabase, so this only
    // runs when starting the OAuth flow itself failed (e.g. misconfiguration).
    if (error) {
      setLoading(false);
      onError?.("Couldn't start Google sign-in. Please try again.");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={handleClick}
      disabled={loading}
      aria-label="Continue with Google"
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
      Continue with Google
    </Button>
  );
}
