import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your workspace"
      description="Start your PropPilot trial — no credit card required."
      footer={
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
