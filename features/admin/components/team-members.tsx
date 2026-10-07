"use client";

import { useEffect, useState } from "react";
import { Loader2, UserCheck, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormError } from "@/features/auth/components/form-error";
import { ROLE_LABELS } from "@/features/auth/access";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  getOrganizationMembers,
  setOrganizationMemberActive,
  setOrganizationMemberRole,
  type InvitableRole,
  type OrganizationMember,
} from "@/lib/api/organization";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

/** Mirrors the backend's rules (OrganizationMemberService.update) so the UI never offers an action that would be refused. */
function canToggle(member: OrganizationMember, me: { id: string; role: string } | null): boolean {
  if (!me || member.id === me.id || member.role === "owner") return false;
  if (member.role === "admin") return me.role === "owner";
  return true;
}

function canChangeRole(member: OrganizationMember, me: { id: string; role: string } | null): boolean {
  return Boolean(me?.role === "owner" && member.id !== me.id && member.role !== "owner");
}

const CHANGEABLE_ROLES: InvitableRole[] = ["renova_agent", "admin", "agent"];

/**
 * Who is in the organization: email, role, whether the account can sign in,
 * and how many Renova cases each one carries. Deactivating keeps the account
 * and every case it owns — the person just can't enter until reactivated.
 */
export function TeamMembers() {
  const { me } = useCurrentUser();
  const [members, setMembers] = useState<OrganizationMember[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<OrganizationMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<{ member: OrganizationMember; role: InvitableRole } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOrganizationMembers().then((response) => {
      if (cancelled) return;
      if (response.ok) setMembers(response.data);
      else setLoadError(getApiErrorMessage(response.error));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirmToggle() {
    if (!pending) return;
    setIsSaving(true);
    setActionError(null);
    const response = await setOrganizationMemberActive(pending.id, !pending.is_active);
    setIsSaving(false);
    setPending(null);
    if (!response.ok) {
      setActionError(getApiErrorMessage(response.error));
      return;
    }
    setMembers((current) => current?.map((m) => (m.id === response.data.id ? response.data : m)) ?? current);
  }

  async function confirmRoleChange() {
    if (!pendingRole) return;
    setIsSaving(true);
    setActionError(null);
    const response = await setOrganizationMemberRole(pendingRole.member.id, pendingRole.role);
    setIsSaving(false);
    setPendingRole(null);
    if (!response.ok) {
      setActionError(getApiErrorMessage(response.error));
      return;
    }
    setMembers((current) => current?.map((m) => (m.id === response.data.id ? response.data : m)) ?? current);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-medium">Usuarios</h3>
          <p className="text-xs text-muted-foreground">
            Cada asesor Retify solo ve los expedientes que tiene asignados; tú ves los de todo el equipo y puedes filtrar por asesor.
          </p>
        </div>
        {actionError && <FormError message={actionError} />}
        {loadError ? (
          <FormError message={loadError} />
        ) : members === null ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Cargando…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Expedientes activos</TableHead>
                  <TableHead className="text-right">Cerrados</TableHead>
                  <TableHead className="text-right">Archivados</TableHead>
                  <TableHead>Alta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id} className={cn(!member.is_active && "opacity-60")}>
                    <TableCell className="font-medium">
                      {member.email ?? "Sin correo"}
                      {member.id === me?.id && <span className="ml-1.5 text-xs text-muted-foreground">(tú)</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {canChangeRole(member, me) ? (
                        <select
                          aria-label={`Rol de ${member.email ?? "este usuario"}`}
                          className="h-8 rounded-md border bg-background px-2 text-xs text-foreground"
                          value={member.role}
                          onChange={(event) =>
                            setPendingRole({ member, role: event.target.value as InvitableRole })
                          }
                        >
                          {CHANGEABLE_ROLES.map((role) => (
                            <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                          ))}
                        </select>
                      ) : (
                        ROLE_LABELS[member.role] ?? member.role
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-transparent",
                          member.is_active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300"
                        )}
                      >
                        {member.is_active ? "Activo" : "Desactivado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{member.renova_cases.active}</TableCell>
                    <TableCell className="text-right tabular-nums">{member.renova_cases.closed}</TableCell>
                    <TableCell className="text-right tabular-nums">{member.renova_cases.archived}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(member.created_at)}</TableCell>
                    <TableCell className="text-right">
                      {canToggle(member, me) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={`${member.is_active ? "Desactivar" : "Reactivar"} a ${member.email ?? "este usuario"}`}
                          onClick={() => setPending(member)}
                        >
                          {member.is_active ? <UserX /> : <UserCheck />}
                          {member.is_active ? "Desactivar" : "Reactivar"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={pending !== null} onOpenChange={(open) => !open && !isSaving && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pending?.is_active ? "Desactivar usuario" : "Reactivar usuario"}</DialogTitle>
            <DialogDescription>
              {pending?.is_active
                ? `${pending.email ?? "Este usuario"} ya no podrá entrar. Sus expedientes y seguimientos se conservan y tú los sigues viendo.`
                : `${pending?.email ?? "Este usuario"} podrá volver a entrar y verá de nuevo sus expedientes.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={isSaving} onClick={() => setPending(null)}>
              Cancelar
            </Button>
            <Button variant={pending?.is_active ? "destructive" : "default"} disabled={isSaving} onClick={confirmToggle}>
              {isSaving ? "Guardando…" : pending?.is_active ? "Desactivar" : "Reactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingRole !== null} onOpenChange={(open) => !open && !isSaving && setPendingRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar permisos</DialogTitle>
            <DialogDescription>
              {pendingRole?.member.email ?? "Este usuario"} cambiará de {pendingRole ? ROLE_LABELS[pendingRole.member.role] : "rol"} a {pendingRole ? ROLE_LABELS[pendingRole.role] : "otro rol"}. El cambio quedará registrado en la bitácora.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={isSaving} onClick={() => setPendingRole(null)}>Cancelar</Button>
            <Button disabled={isSaving} onClick={confirmRoleChange}>{isSaving ? "Guardando…" : "Confirmar cambio"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
