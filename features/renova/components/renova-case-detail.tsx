"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  House,
  Loader2,
  MapPin,
  MessageSquareText,
  Pencil,
  Phone,
  ReceiptText,
  Share2,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormError } from "@/features/auth/components/form-error";
import { GoogleMapsLink } from "@/features/renova/components/google-maps-link";
import { RenovaCaseDialog } from "@/features/renova/components/renova-case-dialog";
import { RenovaCaseHistory } from "@/features/renova/components/renova-case-history";
import { ProtectedDataControls } from "@/features/renova/components/renova-protected-data";
import { RenovaShareDialog } from "@/features/renova/components/renova-share-dialog";
import { advisorLabel, getRenovaErrorMessage } from "@/features/renova/lib/errors";
import { renovaShortId } from "@/features/renova/lib/short-id";
import { useProtectedData } from "@/features/renova/lib/use-protected-data";
import {
  RENOVA_STATUSES,
  formatRenovaDate,
  formatRenovaDeeds,
  formatRenovaDwellingWithDuplex,
  formatRenovaMaritalStatus,
  formatRenovaMoney,
  formatRenovaOccupancy,
  formatRenovaPropertyTaxDebt,
  formatRenovaProposalType,
  formatRenovaStatus,
  getRenovaProposal,
  getRenovaStatusClassName,
  type RenovaCase,
} from "@/features/renova/types";
import { getRenovaCase, updateRenovaCase } from "@/lib/api/renova";
import { useUser } from "@/hooks/useUser";
import { useTeamMembers } from "@/features/organization/use-team-members";
import { cn } from "@/lib/utils";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; renovaCase: RenovaCase };

function clientInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function DataItem({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  const empty = children === null || children === undefined || children === "" || children === false;
  return (
    <div className={cn("min-w-0 border-b border-border/40 pb-3", wide && "sm:col-span-2")}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">{label}</dt>
      <dd className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/95">{empty ? "—" : children}</dd>
    </div>
  );
}

function DataGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">{children}</dl>;
}

function NoteBlock({ label, value, featured }: { label: string; value: string | null; featured?: boolean }) {
  return (
    <div className={cn("rounded-2xl border border-border/50 bg-background/28 p-4", featured && "border-primary/20 bg-primary/[0.045] sm:p-5")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={cn("mt-2 whitespace-pre-wrap text-sm leading-7", featured ? "text-base text-foreground" : "text-foreground/90")}>
        {value || "Sin información registrada."}
      </p>
    </div>
  );
}

function Metric({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={cn("min-w-0 px-4 py-4 sm:px-5", emphasis && "bg-primary/[0.055]")}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className={cn("mt-1.5 truncate text-lg font-semibold tracking-[-0.03em]", emphasis && "text-primary")}>{value}</dd>
    </div>
  );
}

function DossierSection({ id, index, title, description, icon: Icon, action, children }: { id: string; index: string; title: string; description: string; icon: LucideIcon; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 border-b border-border/55 px-5 py-7 last:border-b-0 sm:px-7 sm:py-9 xl:px-9">
      <div className="mb-6 flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.065] text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-primary/75">{index}</span>
            <span className="dossier-rule h-px flex-1" />
          </div>
          <h2 id={`${id}-title`} className="mt-1.5 text-xl font-semibold tracking-[-0.035em]">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {action && <div className="shrink-0 pt-5">{action}</div>}
      </div>
      {children}
    </section>
  );
}

const DOSSIER_NAV = [
  ["contexto", "Comentarios"],
  ["adeudos", "Adeudos"],
  ["propiedad", "Propiedad"],
  ["personas", "Personas"],
  ["historial", "Historial"],
] as const;

/** A client-first Renova dossier: identity first, then conversation context, debts, property and protected identity data. */
export function RenovaCaseDetail({ caseId }: { caseId: string }) {
  const { user } = useUser();
  const members = useTeamMembers();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [historyKey, setHistoryKey] = useState(0);
  // false = closed; true = edit from the top; "adeudos" = open straight at the proposal.
  const [editing, setEditing] = useState<boolean | "adeudos">(false);
  const [sharing, setSharing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const protectedData = useProtectedData(caseId);

  useEffect(() => {
    let cancelled = false;
    getRenovaCase(caseId).then((response) => {
      if (cancelled) return;
      setLoad(response.ok ? { status: "ready", renovaCase: response.data } : { status: "error", message: getRenovaErrorMessage(response.error) });
    });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  function applySaved(saved: RenovaCase) {
    setLoad({ status: "ready", renovaCase: saved });
    setHistoryKey((key) => key + 1);
  }

  async function handleStatusChange(next: string | null) {
    if (load.status !== "ready" || !next || next === load.renovaCase.status || changingStatus) return;
    setChangingStatus(true);
    setActionError(null);
    setNotice(null);
    const response = await updateRenovaCase(caseId, { status: next });
    setChangingStatus(false);
    if (!response.ok) {
      setActionError(getRenovaErrorMessage(response.error));
      return;
    }
    applySaved(response.data);
    setNotice(`Estado actualizado a “${formatRenovaStatus(next)}”.`);
  }

  const c = load.status === "ready" ? load.renovaCase : null;
  const money = (value: string | null) => (c ? formatRenovaMoney(value, c.currency) : "—");
  const proposal = c ? getRenovaProposal(c) : null;

  return (
    <>
      <Link href="/leads?view=renova" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Volver a Renova
      </Link>

      {load.status === "loading" && (
        <div className="surface-panel flex flex-col items-center gap-2 rounded-2xl border py-20 text-center">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Cargando expediente…</p>
        </div>
      )}
      {load.status === "error" && <div className="surface-panel rounded-2xl border p-6"><FormError message={load.message} /></div>}

      {c && (
        <>
          <header className="surface-panel relative mb-5 overflow-hidden rounded-[1.75rem] border border-border/65 px-5 py-6 sm:px-7 sm:py-7 xl:px-9">
            <div className="pointer-events-none absolute -right-24 -top-32 size-80 rounded-full bg-primary/12 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />
            <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex min-w-0 items-start gap-4 sm:gap-5">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-sm font-semibold text-primary sm:size-14">{clientInitials(c.owner_name)}</span>
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{renovaShortId(c.id)}</span>
                    <Badge variant="outline" className={cn("border-transparent", getRenovaStatusClassName(c.status))}>{formatRenovaStatus(c.status)}</Badge>
                  </div>
                  <h1 className="truncate text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">{c.owner_name}</h1>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Phone className="size-3.5" aria-hidden="true" />{c.owner_phone || "Sin teléfono"}</span>
                    <span className="flex items-center gap-1.5"><UserRound className="size-3.5" aria-hidden="true" />{advisorLabel(c.assigned_user_id, user?.id, members)}</span>
                    <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" aria-hidden="true" />Ingreso {formatRenovaDate(c.entry_date)}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={c.status} onValueChange={handleStatusChange}>
                  <SelectTrigger size="sm" aria-label="Cambiar estado" disabled={changingStatus} className="rounded-xl bg-background/35"><SelectValue>{() => "Cambiar estado"}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {RENOVA_STATUSES.filter((status) => status !== "draft" || c.status === "draft").map((status) => <SelectItem key={status} value={status}>{formatRenovaStatus(status)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="rounded-xl bg-background/35" onClick={() => { protectedData.hide(); setEditing(true); }}><Pencil /> Editar</Button>
                <Button size="sm" className="rounded-xl" onClick={() => setSharing(true)}><Share2 /> Ver ficha para compartir</Button>
              </div>
            </div>
          </header>

          {notice && <p role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"><CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />{notice}</p>}
          {actionError && <div className="mb-4"><FormError message={actionError} /></div>}

          <dl className="mb-5 grid overflow-hidden rounded-2xl border border-border/60 bg-card/40 sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-border/50">
            <Metric label="Adeudos estimados" value={money(c.total_debt)} emphasis />
            <Metric label="Valor de mercado" value={money(c.market_value)} />
            <Metric
              label="Valor de la propuesta"
              value={proposal!.state === "legacy" ? `${money(proposal!.legacyFinalOffer)} (sin clasificar)` : money(proposal!.totalProposalValue)}
            />
            <Metric label="Espera recibir" value={money(c.owner_expected_amount)} />
          </dl>

          <div className="grid gap-5 lg:grid-cols-[11rem_minmax(0,1fr)] xl:grid-cols-[12rem_minmax(0,1fr)]">
            <nav aria-label="Secciones del expediente" className="lg:sticky lg:top-6 lg:self-start">
              <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border/55 bg-card/35 p-1.5 lg:flex-col lg:p-2">
                {DOSSIER_NAV.map(([href, label], index) => <a key={href} href={`#${href}`} className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-primary/[0.07] hover:text-foreground"><span className="font-mono text-[9px] text-primary/70">0{index + 1}</span>{label}</a>)}
              </div>
            </nav>

            <div className="min-w-0">
              <article className="surface-panel overflow-hidden rounded-[1.75rem] border border-border/65">
                <DossierSection id="contexto" index="01" title="Contexto y comentarios" description="Lo importante de la conversación antes de entrar a los números." icon={MessageSquareText}>
                  <div className="grid gap-3 xl:grid-cols-2">
                    <div className="xl:col-span-2"><NoteBlock label="Notas de la conversación" value={c.notes} featured /></div>
                    <NoteBlock label="Comentarios generales" value={c.general_situation} />
                    <NoteBlock label="Motivo de venta" value={c.sale_reason} />
                  </div>
                </DossierSection>

                <DossierSection
                  id="adeudos"
                  index="02"
                  title="Adeudos y propuesta"
                  description="Obligaciones conocidas y cifras de la posible operación."
                  icon={ReceiptText}
                  action={
                    <Button size="sm" variant="outline" className="rounded-xl bg-background/35" onClick={() => { protectedData.hide(); setEditing("adeudos"); }}>
                      <Pencil /> Editar propuesta
                    </Button>
                  }
                >
                  <DataGrid>
                    <DataItem label="Deuda predial">{formatRenovaPropertyTaxDebt(c.property_tax_debt, c.property_tax_debt_unit, c.currency) ?? "—"}</DataItem>
                    <DataItem label="Adeudo">{money(c.other_debt)}</DataItem>
                    <DataItem label="Deuda de agua">{money(c.water_debt)}</DataItem>
                    <DataItem label="Deuda de luz">{money(c.electricity_debt)}</DataItem>
                    <DataItem label="Deuda de gas">{money(c.gas_debt)}</DataItem>
                    <DataItem label="A quién se debe">{c.debt_owed_to}</DataItem>
                    <DataItem label="Total estimado de adeudos">{money(c.total_debt)}</DataItem>
                    {proposal!.state === "classified" ? (
                      <>
                        <DataItem label="Modalidad de la propuesta">{formatRenovaProposalType(proposal!.proposalType)}</DataItem>
                        <DataItem label="Deuda que cubre Renova">{money(proposal!.debtCoverageAmount)}</DataItem>
                        <DataItem label="Efectivo para el propietario">{money(proposal!.ownerCashOffer)}</DataItem>
                        <DataItem label="Valor total de la propuesta">{money(proposal!.totalProposalValue)}</DataItem>
                      </>
                    ) : proposal!.state === "legacy" ? (
                      <DataItem label="Propuesta histórica (sin clasificar)" wide>
                        {money(proposal!.legacyFinalOffer)} — edita el expediente para clasificarla.
                      </DataItem>
                    ) : (
                      <DataItem label="Propuesta">Sin propuesta registrada.</DataItem>
                    )}
                  </DataGrid>
                </DossierSection>

                <DossierSection id="propiedad" index="03" title="Propiedad" description="Ubicación, configuración física y situación documental." icon={House}>
                  <div className="mb-6 flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <div className="flex flex-col gap-3">
                      <div><p className="text-sm font-medium">{c.street_address || "Dirección sin registrar"}</p><p className="mt-1 text-xs text-muted-foreground">{[c.neighborhood, c.municipality, c.postal_code].filter(Boolean).join(" · ") || "Ubicación pendiente"}</p></div>
                      <GoogleMapsLink address={c} hideWhenIncomplete />
                    </div>
                  </div>
                  <DataGrid>
                    <DataItem label="Tipo de vivienda">{formatRenovaDwellingWithDuplex(c.dwelling_type, c.is_duplex)}</DataItem>
                    <DataItem label="Situación actual">{c.occupancy_status ? formatRenovaOccupancy(c.occupancy_status) : null}</DataItem>
                    <DataItem label="Plantas">{c.floors}</DataItem>
                    <DataItem label="Baños">{c.bathrooms}</DataItem>
                    <DataItem label="Recámaras">{c.bedrooms}</DataItem>
                    <DataItem label="Escrituras">{formatRenovaDeeds(c.has_deeds)}</DataItem>
                    <DataItem label="A nombre de">{c.deeds_holder_name}</DataItem>
                    <DataItem label="Condiciones de la casa" wide>{c.conditions}</DataItem>
                  </DataGrid>
                </DossierSection>

                <DossierSection id="personas" index="04" title="Personas y datos protegidos" description="Titular, cónyuge e identificadores con acceso controlado." icon={ShieldCheck}>
                  <DataGrid>
                    <DataItem label="Nombre completo del titular">{c.owner_name}</DataItem>
                    <DataItem label="Celular del titular">{c.owner_phone}</DataItem>
                    <DataItem label="Estado civil al adquirir el inmueble">{c.marital_status ? formatRenovaMaritalStatus(c.marital_status) : null}</DataItem>
                    <DataItem label="Nombre completo del cónyuge">{c.spouse_name}</DataItem>
                    <DataItem label="Celular del cónyuge">{c.spouse_phone}</DataItem>
                    <DataItem label="NSS"><span data-testid="nss-display" className="font-mono tracking-wide">{protectedData.values?.nss ?? c.nss_masked ?? "No registrado"}</span></DataItem>
                    <DataItem label="Número de crédito"><span data-testid="credit-number-display" className="font-mono tracking-wide">{protectedData.values?.credit_number ?? c.credit_number_masked ?? "No registrado"}</span></DataItem>
                  </DataGrid>
                  {(c.has_nss || c.has_credit_number) && <div className="mt-5"><ProtectedDataControls protectedData={protectedData} /></div>}
                </DossierSection>
              </article>
              <div id="historial" className="mt-5 scroll-mt-6"><RenovaCaseHistory caseId={caseId} refreshKey={historyKey} /></div>
            </div>
          </div>
        </>
      )}

      {editing && <RenovaCaseDialog caseId={caseId} focusSection={editing === "adeudos" ? "adeudos" : undefined} onClose={() => setEditing(false)} onSaved={(saved) => { setEditing(false); applySaved(saved); setNotice("Cambios guardados."); setActionError(null); }} />}
      {sharing && <RenovaShareDialog caseId={caseId} onClose={() => setSharing(false)} />}
    </>
  );
}
