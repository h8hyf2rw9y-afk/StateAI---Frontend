"use client";

import { useEffect, useState } from "react";
import { canManageTeam } from "@/features/auth/access";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { getOrganizationMembers, type OrganizationMember } from "@/lib/api/organization";

/**
 * The organization's members, for owners/admins only (GET /organization/members
 * is owner/admin-gated). Everyone else gets an empty list and never makes the
 * request — they only ever see their own cases anyway.
 */
export function useTeamMembers(): OrganizationMember[] {
  const { me } = useCurrentUser();
  const enabled = canManageTeam(me?.role);
  const [members, setMembers] = useState<OrganizationMember[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getOrganizationMembers().then((response) => {
      if (!cancelled && response.ok) setMembers(response.data);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return enabled ? members : [];
}
