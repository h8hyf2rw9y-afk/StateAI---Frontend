/**
 * Hand-rolled client-side validation for the auth forms — deliberately not
 * pulling in a schema library (Zod et al.) for five fields. This is a UX
 * layer only: Supabase re-validates everything server-side (and is the
 * actual source of truth), so these checks exist purely to give the user
 * fast, specific feedback before a network round trip.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

/** Mirrors the password rule surfaced in getAuthErrorMessage's "weak_password" copy — keep the two in sync. */
export function getPasswordRequirementError(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-zA-Z]/.test(password)) return "Password must contain at least one letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  return null;
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};
  if (!values.email.trim()) errors.email = "Email is required.";
  else if (!isValidEmail(values.email)) errors.email = "Enter a valid email address.";

  if (!values.password) errors.password = "Password is required.";

  return errors;
}

export interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterFormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function validateRegisterForm(values: RegisterFormValues): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  if (!values.firstName.trim()) errors.firstName = "First name is required.";
  if (!values.lastName.trim()) errors.lastName = "Last name is required.";

  if (!values.email.trim()) errors.email = "Email is required.";
  else if (!isValidEmail(values.email)) errors.email = "Enter a valid email address.";

  if (!values.password) {
    errors.password = "Password is required.";
  } else {
    const passwordError = getPasswordRequirementError(values.password);
    if (passwordError) errors.password = passwordError;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (values.password && values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords don't match.";
  }

  return errors;
}
