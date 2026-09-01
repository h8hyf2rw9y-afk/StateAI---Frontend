"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
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

export function RegisterForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Stored on the Supabase auth user (auth.users.raw_user_meta_data),
        // not a separate public table — see the project's "no CRM tables
        // yet" rule. A public profile row is a FastAPI/backend concern.
        data: { first_name: firstName.trim(), last_name: lastName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setIsSubmitting(false);
      setFormError(getAuthErrorMessage(error));
      return;
    }

    // Email confirmation is on (the default): no session yet, show a
    // "check your email" state rather than pretending sign-up finished.
    if (!data.session) {
      setIsSubmitting(false);
      setSubmittedEmail(email);
      return;
    }

    // Email confirmation is off in this project's Supabase settings —
    // the user is already signed in.
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
        Create account
      </Button>

      <AuthDivider />

      <GoogleButton onError={setFormError} />
    </form>
  );
}
