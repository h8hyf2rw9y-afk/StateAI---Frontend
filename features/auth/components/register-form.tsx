"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, Loader2, Users } from "lucide-react";
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
import { joinOrganization, previewOrganizationInvitation } from "@/lib/api/organization";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const inviteError = searchParams.get("invite_error");

  const [inviteCode, setInviteCode] = useState(inviteToken ?? "");
  const [validatedInvite, setValidatedInvite] = useState<string | null>(null);
  const [isCheckingInvite, setIsCheckingInvite] = useState(Boolean(inviteToken));
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [formError, setFormError] = useState<string | undefined>(
    inviteError ? "La invitación no pudo completarse. Verifica el código y que estés usando el correo invitado." : undefined
  );
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
      const preview = response.ok
        ? { valid: response.data.valid, organizationName: response.data.organization_name }
        : { valid: false, organizationName: null };
      setInvitePreview(preview);
      setValidatedInvite(preview.valid ? inviteToken : null);
      if (!preview.valid) setFormError("Este código de invitación ya no es válido o expiró.");
      setIsCheckingInvite(false);
    });
    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  async function validateInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const credential = inviteCode.trim();
    if (!credential) {
      setFormError("Escribe el código que te compartió tu administrador.");
      return;
    }
    setIsCheckingInvite(true);
    setFormError(undefined);
    const response = await previewOrganizationInvitation(credential);
    setIsCheckingInvite(false);
    const preview = response.ok
      ? { valid: response.data.valid, organizationName: response.data.organization_name }
      : { valid: false, organizationName: null };
    setInvitePreview(preview);
    setValidatedInvite(preview.valid ? credential : null);
    if (!preview.valid) setFormError("Código inválido, vencido o utilizado. Pide una invitación nueva.");
  }

  /** The verified Google/email identity must consume this exact one-time invitation; never create a separate workspace as a fallback. */
  async function joinAfterSignIn(): Promise<boolean> {
    if (!validatedInvite) return false;
    const response = await joinOrganization(validatedInvite);
    if (response.ok) return true;
    setFormError("No pudimos aplicar la invitación. Confirma que entraste con el mismo correo que fue invitado.");
    return false;
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
    if (validatedInvite) callbackUrl.searchParams.set("invite", validatedInvite);

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
    if (!(await joinAfterSignIn())) {
      setIsSubmitting(false);
      return;
    }

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

  if (!validatedInvite) {
    return (
      <form onSubmit={validateInvitation} className="flex flex-col gap-4">
        <FormError message={formError} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invite-code">Código de invitación</Label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="invite-code"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              placeholder="ABCDE-FG234"
              autoComplete="one-time-code"
              className="pl-9 font-mono uppercase tracking-wider"
              disabled={isCheckingInvite}
            />
          </div>
          <p className="text-xs text-muted-foreground">El código es personal, dura 7 días y define si entrarás como asesor o administrador.</p>
        </div>
        <Button type="submit" disabled={isCheckingInvite || !inviteCode.trim()} className="w-full">
          {isCheckingInvite && <Loader2 className="size-4 animate-spin" />}
          Verificar código
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={formError} />

      {invitePreview?.valid && (
        <div
          role="status"
          className={
            invitePreview.valid
              ? "flex items-start gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground"
              : "flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground"
          }
        >
          <Users className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>Invitación verificada para <span className="font-medium">{invitePreview.organizationName}</span>.</span>
        </div>
      )}

      <GoogleButton onError={setFormError} inviteToken={validatedInvite} />

      <AuthDivider />

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
        Unirme con correo
      </Button>
    </form>
  );
}
