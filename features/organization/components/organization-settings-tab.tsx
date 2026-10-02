"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Copy, Loader2, UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormError } from "@/features/auth/components/form-error";
import { getApiErrorMessage } from "@/lib/api/errors";
import { getMe, type CurrentUser } from "@/lib/api/me";
import {
  createOrganizationInvitation,
  getMyOrganization,
  getOrganizationInvitations,
  revokeOrganizationInvitation,
  type Organization,
  type OrganizationInvitation,
} from "@/lib/api/organization";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = { owner: "Owner", admin: "Admin", agent: "Agent" };
const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  revoked: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
};
const STATUS_LABELS: Record<string, string> = { pending: "Pending", accepted: "Accepted", revoked: "Revoked" };

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

/**
 * Brings a teammate into THIS organization (not a brand-new one — see
 * lib/api/organization.ts). There's no email-sending integration yet, so
 * the owner/admin shares the generated `/register?invite=` link themselves
 * (WhatsApp, email, however); the invited email is still checked against
 * the signing-up account at accept time, so a leaked link alone isn't
 * enough.
 */
export function OrganizationSettingsTab() {
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [invitations, setInvitations] = useState<OrganizationInvitation[] | null>(null);
  const [invitationsRefresh, setInvitationsRefresh] = useState(0);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "agent">("agent");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [newInviteLink, setNewInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const canManage = me?.role === "owner" || me?.role === "admin";

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    getOrganizationInvitations().then((response) => {
      if (cancelled) return;
      if (response.ok) setInvitations(response.data);
    });
    return () => {
      cancelled = true;
    };
  }, [canManage, invitationsRefresh]);

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || isInviting) return;
    setInviteError(null);
    setIsInviting(true);
    const response = await createOrganizationInvitation(email.trim(), role);
    setIsInviting(false);
    if (!response.ok) {
      setInviteError(getApiErrorMessage(response.error));
      return;
    }
    setNewInviteLink(`${window.location.origin}/register?invite=${response.data.token}`);
    setEmail("");
    setCopied(false);
    setInvitationsRefresh((n) => n + 1);
  }

  async function handleRevoke(invitationId: string) {
    await revokeOrganizationInvitation(invitationId);
    setInvitationsRefresh((n) => n + 1);
  }

  async function copyLink() {
    if (!newInviteLink) return;
    try {
      await navigator.clipboard.writeText(newInviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied (permissions, non-HTTPS context) — the link stays visible and selectable either way.
    }
  }

  if (loadError) {
    return (
      <Card>
        <CardContent>
          <FormError message={loadError} />
        </CardContent>
      </Card>
    );
  }

  // `canManage` reads `me?.role`, which is indistinguishable from "really
  // not an owner/admin" while `me` is still null because the request just
  // hasn't resolved yet — without this, every single viewer (owners
  // included) briefly saw "Only the owner or an admin can invite
  // teammates" flash before the real content replaced it.
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
            <Input id="org-role" value={me ? ROLE_LABELS[me.role] : ""} disabled />
          </div>
        </CardContent>
      </Card>

      {canManage ? (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-medium">Invite a teammate</h3>
                <p className="text-xs text-muted-foreground">
                  There&apos;s no automatic email yet — you&apos;ll get a link to share yourself (WhatsApp, email,
                  however works for you). It expires in 7 days.
                </p>
              </div>
              <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@agency.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isInviting}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:w-40">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v === "admin" ? "admin" : "agent")}>
                    <SelectTrigger id="invite-role">
                      <SelectValue>{(v: string | null) => ROLE_LABELS[v ?? "agent"]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">Agent</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={isInviting || !email.trim()}>
                  {isInviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                  Invite
                </Button>
              </form>
              {inviteError && <FormError message={inviteError} />}

              {newInviteLink && (
                <div
                  role="status"
                  className="flex flex-col gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3"
                >
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    Invitation created — share this link:
                  </p>
                  <div className="flex gap-2">
                    <Input readOnly value={newInviteLink} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
                    <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={copyLink}>
                      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3">
              <h3 className="text-sm font-medium">Invitations</h3>
              {invitations === null ? (
                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading…
                </div>
              ) : invitations.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No invitations yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell className="text-muted-foreground">{ROLE_LABELS[invitation.role] ?? invitation.role}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("border-transparent", STATUS_STYLES[invitation.status])}>
                            {STATUS_LABELS[invitation.status] ?? invitation.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(invitation.expires_at)}</TableCell>
                        <TableCell className="text-right">
                          {invitation.status === "pending" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Revoke invitation for ${invitation.email}`}
                              title="Revoke"
                              onClick={() => handleRevoke(invitation.id)}
                            >
                              <X className="size-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Only the organization&apos;s owner or an admin can invite teammates.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
