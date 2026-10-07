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
import { ROLE_LABELS } from "@/features/auth/access";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  createOrganizationInvitation,
  getOrganizationInvitations,
  revokeOrganizationInvitation,
  type InvitableRole,
  type OrganizationInvitation,
} from "@/lib/api/organization";
import { cn } from "@/lib/utils";

const OWNER_INVITABLE_ROLES: InvitableRole[] = ["renova_agent", "admin", "agent"];
const ROLE_HINTS: Record<InvitableRole, string> = {
  renova_agent: "Solo usa Retify y solo ve los expedientes que tiene asignados.",
  agent: "Usa todo el CRM compartido de la organización.",
  admin: "Supervisa todo Retify y administra asesores, sin acceso a tu CRM general.",
};
const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  accepted: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  revoked: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
};
const STATUS_LABELS: Record<string, string> = { pending: "Pendiente", accepted: "Aceptada", revoked: "Revocada" };

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role as InvitableRole] ?? role;
}

/**
 * Brings a teammate into THIS organization. There's no email-sending
 * integration yet, so the owner/admin shares the generated `/register?invite=`
 * link themselves (WhatsApp, email…); the invited email is still checked
 * against the signing-up account at accept time, so a leaked link alone
 * isn't enough. Defaults to "Asesor Renova", the role this is mostly used for.
 */
export function TeamInvitations() {
  const { me } = useCurrentUser();
  const [invitations, setInvitations] = useState<OrganizationInvitation[] | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("renova_agent");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [newInviteLink, setNewInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const invitableRoles: InvitableRole[] = me?.role === "owner" ? OWNER_INVITABLE_ROLES : ["renova_agent"];

  useEffect(() => {
    let cancelled = false;
    getOrganizationInvitations().then((response) => {
      if (!cancelled && response.ok) setInvitations(response.data);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

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
    setRefresh((n) => n + 1);
  }

  async function handleRevoke(invitationId: string) {
    await revokeOrganizationInvitation(invitationId);
    setRefresh((n) => n + 1);
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

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-medium">Invitar a alguien</h3>
            <p className="text-xs text-muted-foreground">
              Todavía no se envía un correo automático: obtendrás un enlace para compartirlo tú (WhatsApp, correo…). Vence en
              7 días y solo funciona con el correo que escribas aquí.
            </p>
          </div>
          <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="invite-email">Correo</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="asesor@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isInviting}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:w-48">
              <Label htmlFor="invite-role">Rol</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(invitableRoles.includes(v as InvitableRole) ? (v as InvitableRole) : "renova_agent")}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue>{(v: string | null) => roleLabel(v ?? "renova_agent")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {invitableRoles.map((value) => (
                    <SelectItem key={value} value={value}>
                      {ROLE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isInviting || !email.trim()}>
              {isInviting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Invitar
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">{ROLE_HINTS[role]}</p>
          {inviteError && <FormError message={inviteError} />}

          {newInviteLink && (
            <div role="status" className="flex flex-col gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Invitación creada — comparte este enlace:</p>
              <div className="flex gap-2">
                <Input readOnly value={newInviteLink} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
                <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={copyLink}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">Invitaciones</h3>
          {invitations === null ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Cargando…
            </div>
          ) : invitations.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aún no hay invitaciones.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell className="text-muted-foreground">{roleLabel(invitation.role)}</TableCell>
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
                          aria-label={`Revocar invitación de ${invitation.email}`}
                          title="Revocar"
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
    </div>
  );
}
