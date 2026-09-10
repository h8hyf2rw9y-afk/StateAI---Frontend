"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/features/auth/components/password-input";
import { GoogleButton } from "@/features/auth/components/google-button";
import { AuthDivider } from "@/features/auth/components/auth-divider";
import { FormError } from "@/features/auth/components/form-error";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/features/auth/lib";
import { validateLoginForm, type LoginFormErrors } from "@/features/auth/validation";
import { provisionMyOrganization } from "@/lib/api/me";

/** Where to send a signed-in user, honoring proxy.ts's `?next=` (set when it bounced them here from a protected route). */
function getRedirectTarget(): string {
  if (typeof window === "undefined") return "/dashboard";
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") ? next : "/dashboard";
}

export function LoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [formError, setFormError] = useState<string | undefined>(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const validationErrors = validateLoginForm({ email, password });
    setErrors(validationErrors);
    setFormError(undefined);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setIsSubmitting(false);
      setFormError(getAuthErrorMessage(error));
      return;
    }

    // Idempotent — safe on every login, not just a brand-new signup (see
    // lib/api/me.ts). Best-effort: a failure here isn't shown as a login
    // error (apiRequest never throws — see its own doc comment — so
    // nothing here needs a try/catch) — the dashboard's own real-data
    // loading already surfaces a clear error state if the account still
    // isn't provisioned, so this never silently strands the user without
    // any explanation.
    await provisionMyOrganization();

    router.push(getRedirectTarget());
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={formError} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@agency.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errors.email)}
          disabled={isSubmitting}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(errors.password)}
          disabled={isSubmitting}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        Sign in
      </Button>

      <AuthDivider />

      <GoogleButton onError={setFormError} />
    </form>
  );
}
