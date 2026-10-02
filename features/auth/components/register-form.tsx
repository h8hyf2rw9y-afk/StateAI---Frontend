"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/features/auth/components/password-input";
import { GoogleButton } from "@/features/auth/components/google-button";
import { AuthDivider } from "@/features/auth/components/auth-divider";
import { FormError } from "@/features/auth/components/form-error";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/features/auth/lib";
import { validateRegisterForm, type RegisterFormErrors } from "@/features/auth/validation";
import { provisionMyOrganization } from "@/lib/api/me";
import { joinOrganization, previewOrganizationInvitation } from "@/lib/api/organization";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  // null = still checking (or no ?invite= at all); otherwise whether the
  // link actually still works and, if so, which organization it joins.
  const [invitePreview, setInvitePreview] = useState<{ valid: boolean; organizationName: string | null } | null>(
    null
  );

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    previewOrganizationInvitation(inviteToken).then((response) => {
      if (cancelled) return;
      setInvitePreview(
        response.ok
          ? { valid: response.data.valid, organizationName: response.data.organization_name }
          : { valid: false, organizationName: null }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  /** Joins the inviter's organization when the link is still valid; otherwise falls back to the normal self-service "create my own workspace" path (same call every other sign-up already makes). */
  async function provisionAfterSignIn() {
    if (inviteToken && invitePreview?.valid) {
      const response = await joinOrganization(inviteToken);
      if (response.ok) return;
      // The link died between preview and submit (e.g. someone else just
      // used it) — degrade gracefully rather than stranding a real,
      // already-created account with no organization at all.
    }
    await provisionMyOrganization();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const validationErrors = validateRegisterForm({
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    });
    setErrors(validationErrors);
    setFormError(undefined);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (inviteToken && invitePreview?.valid) callbackUrl.searchParams.set("invite", inviteToken);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Stored on the Supabase auth user (auth.users.raw_user_meta_data),
        // not a separate public table — see the project's "no CRM tables
        // yet" rule. A public profile row is a FastAPI/backend concern.
        data: { first_name: firstName.trim(), last_name: lastName.trim() },
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      setIsSubmitting(false);
      setFormError(getAuthErrorMessage(error));
      return;
    }

    // Email confirmation is on (the default): no session yet, show a
    // "check your email" state rather than pretending sign-up finished.
    // The invite token travels along in emailRedirectTo above, so
    // app/auth/callback/route.ts can join the right organization once the
    // link is clicked — this component is done for now.
    if (!data.session) {
      setIsSubmitting(false);
      setSubmittedEmail(email);
      return;
    }

    // Email confirmation is off in this project's Supabase settings —
    // the user is already signed in. Same idempotent provisioning every
    // real sign-in makes (see LoginForm) — this is the one path where a
    // session goes active without ever touching LoginForm or the
    // /auth/callback route.
    await provisionAfterSignIn();

    router.push("/dashboard");
    router.refresh();
  }

  if (submittedEmail) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-5" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium">Check your email</p>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to <span className="font-medium text-foreground">{submittedEmail}</span>.
          Follow it to activate your account and sign in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={formError} />

      {inviteToken && invitePreview && (
        <div
          role="status"
          className={
            invitePreview.valid
              ? "flex items-start gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground"
              : "flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground"
          }
        >
          <Users className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {invitePreview.valid ? (
            <span>
              You&apos;ve been invited to join <span className="font-medium">{invitePreview.organizationName}</span>.
            </span>
          ) : (
            <span>This invitation link is no longer valid. You can still create your own workspace below.</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            placeholder="Jane"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            aria-invalid={Boolean(errors.firstName)}
            disabled={isSubmitting}
          />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            placeholder="Rivera"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            aria-invalid={Boolean(errors.lastName)}
            disabled={isSubmitting}
          />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
        </div>
      </div>

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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(errors.password)}
          disabled={isSubmitting}
        />
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password}</p>
        ) : (
          <p className="text-xs text-muted-foreground">At least 8 characters, with a letter and a number.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInput
          id="confirmPassword"
          placeholder="••••••••"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          aria-invalid={Boolean(errors.confirmPassword)}
          disabled={isSubmitting}
        />
        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {inviteToken && invitePreview?.valid ? "Join workspace" : "Create account"}
      </Button>

      <AuthDivider />

      <GoogleButton onError={setFormError} inviteToken={inviteToken && invitePreview?.valid ? inviteToken : undefined} />
    </form>
  );
}
