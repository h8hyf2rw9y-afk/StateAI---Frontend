import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";

/** Centered card layout shared by the login and register pages. */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-muted/30 px-4 py-12">
      <Logo />
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-1.5 text-center">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
      {footer}
    </div>
  );
}
