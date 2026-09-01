import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

const OAUTH_ERROR_MESSAGE = "Google sign-in didn't complete. Please try again.";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to your PropPilot workspace."
      footer={
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-foreground underline underline-offset-4">
            Create one
          </Link>
        </p>
      }
    >
      <LoginForm initialError={error === "oauth_failed" ? OAUTH_ERROR_MESSAGE : undefined} />
    </AuthShell>
  );
}
