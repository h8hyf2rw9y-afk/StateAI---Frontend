"use client";

import { useState } from "react";
import { Crown, Eye, ShieldCheck, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { cn } from "@/lib/utils";

type PreviewRole = "owner" | "admin" | "renova_agent";
const PREVIEWS = {
  owner: { label: "Administrador supremo", icon: Crown, modules: ["Dashboard CRM", "Leads", "Propiedades", "Pipeline", "Retify", "IA", "Administración"], permissions: ["Control total del equipo", "Cambia roles y estados", "Ve cartera propia y del equipo"] },
  admin: { label: "Administrador", icon: ShieldCheck, modules: ["Expedientes Retify", "Pipeline Retify", "Operaciones", "Chat Retify", "Administración"], permissions: ["Supervisa todos los asesores", "Invita y desactiva asesores", "No accede al CRM general ni controla al owner"] },
  renova_agent: { label: "Asesor Retify", icon: UserRound, modules: ["Mis expedientes", "Mi pipeline", "Mis operaciones", "Chat Retify", "Configuración"], permissions: ["Solo ve expedientes asignados", "Registra llamadas y seguimientos", "No ve administración ni otros asesores"] },
} satisfies Record<PreviewRole, { label: string; icon: typeof Crown; modules: string[]; permissions: string[] }>;

export function RoleAccessPreview() {
  const { me } = useCurrentUser();
  const [role, setRole] = useState<PreviewRole>("admin");
  if (me?.role !== "owner") return null;
  const preview = PREVIEWS[role];
  const Icon = preview.icon;
  return <Card><CardContent className="flex flex-col gap-4 p-5 sm:p-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><div className="flex items-center gap-2"><Eye className="size-4 text-primary"/><h3 className="text-sm font-semibold">Vista previa por rol</h3></div><p className="mt-1 text-xs text-muted-foreground">Simula lo que verá cada perfil. No cambia tu sesión ni tus permisos.</p></div><div className="flex flex-wrap gap-1.5">{(Object.keys(PREVIEWS) as PreviewRole[]).map(value => <Button key={value} type="button" size="sm" variant={role === value ? "default" : "outline"} onClick={() => setRole(value)}>{PREVIEWS[value].label}</Button>)}</div></div>
    <div className="grid overflow-hidden rounded-2xl border md:grid-cols-[220px_1fr]"><aside className="border-b bg-slate-950 p-4 text-slate-100 md:border-b-0 md:border-r"><div className="flex items-center gap-2 border-b border-white/10 pb-4"><Icon className="size-4 text-emerald-300"/><span className="text-sm font-medium">{preview.label}</span></div><nav className="mt-3 flex flex-col gap-1">{preview.modules.map((module,index)=><div key={module} className={cn("rounded-lg px-3 py-2 text-xs", index===0?"bg-white/10 text-white":"text-slate-400")}>{module}</div>)}</nav></aside><div className="bg-muted/15 p-5"><Badge variant="outline">Acceso efectivo</Badge><h4 className="mt-3 text-lg font-semibold">{preview.label}</h4><div className="mt-4 grid gap-2 sm:grid-cols-3">{preview.permissions.map(permission=><div key={permission} className="rounded-xl border bg-background p-3 text-sm"><span className="mr-2 text-emerald-500">●</span>{permission}</div>)}</div></div></div>
  </CardContent></Card>;
}
