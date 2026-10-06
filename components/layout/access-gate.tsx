"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { homePathFor, isPathAllowed } from "@/features/auth/access";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { createClient } from "@/lib/supabase/client";

const BLOCKED_MESSAGES: Record<string, { title: string; body: string }> = {
  "This account has been deactivated.": {
    title: "Tu acceso está desactivado",
    body: "Un administrador desactivó esta cuenta. Tus expedientes siguen guardados; pide que te reactiven para volver a entrar.",
  },
  "This account is not yet assigned to an organization.": {
    title: "Tu cuenta aún no tiene acceso",
    body: "Para entrar necesitas una invitación. Pide a tu administrador que te invite con este correo y abre el enlace que te comparta.",
  },
};

/**
 * Renders a page only once the caller's role is known and allowed there:
 * a Renova-only advisor who opens /dashboard (or any CRM page) is sent to
 * Leads → Renova, and /admin is only for owners/admins. A deactivated or
 * not-yet-invited account sees why, with a way to sign out.
 */
export function AccessGate({ children }: { children: ReactNode }) {
  const { me, error, isLoading } = useCurrentUser();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const allowed = me ? isPathAllowed(me.role, pathname) : true;

  useEffect(() => {
    if (me && !allowed) router.replace(homePathFor(me.role));
  }, [me, allowed, router]);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const blocked = error?.status === 403 ? BLOCKED_MESSAGES[error.message] : undefined;
  if (blocked) {
    return (
      <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 rounded-2xl border bg-card/60 p-8 text-center">
        <ShieldAlert className="size-8 text-amber-500" aria-hidden="true" />
        <h1 className="text-lg font-semibold">{blocked.title}</h1>
        <p className="text-sm text-muted-foreground">{blocked.body}</p>
        <Button variant="outline" onClick={signOut}>
          <LogOut /> Cerrar sesión
        </Button>
      </div>
    );
  }

  if (isLoading || !allowed) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando…
      </div>
    );
  }
  return <>{children}</>;
}
