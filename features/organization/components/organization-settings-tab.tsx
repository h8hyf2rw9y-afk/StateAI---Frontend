"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/features/auth/components/form-error";
import { ROLE_LABELS, canManageTeam } from "@/features/auth/access";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getMe, type CurrentUser } from "@/lib/api/me";
import { getMyOrganization, type Organization } from "@/lib/api/organization";

/**
 * The organization's name and the caller's role. Managing people (members,
 * invitations, deactivating) lives in one place — the Administración page —
 * so owners/admins get a link there instead of a second copy of it here.
 */
export function OrganizationSettingsTab() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMe(), getMyOrganization()]).then(([meResponse, orgResponse]) => {
      if (cancelled) return;
      if (meResponse.ok) setMe(meResponse.data);
      else setLoadError(getApiErrorMessage(meResponse.error));
      if (orgResponse.ok) setOrganization(orgResponse.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <Card>
        <CardContent>
          <FormError message={loadError} />
        </CardContent>
      </Card>
    );
  }

  if (me === null) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex max-w-md flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-name">Organization name</Label>
            <Input id="org-name" value={organization?.name ?? ""} disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="org-role">Your role</Label>
            <Input id="org-role" value={ROLE_LABELS[me.role] ?? me.role} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col items-start gap-3">
          {canManageTeam(me.role) ? (
            <>
              <p className="text-sm text-muted-foreground">
                Invita asesores, revisa quién tiene acceso y desactiva cuentas desde Administración.
              </p>
              <Link href="/admin" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Ir a Administración <ArrowRight />
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Only the organization&apos;s owner or an admin can invite teammates.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
