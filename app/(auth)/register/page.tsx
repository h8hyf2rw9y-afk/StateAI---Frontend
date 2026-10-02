import { Suspense } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

/** RegisterForm reads `?invite=` via useSearchParams, which Next.js wants inside a Suspense boundary. */
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
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
