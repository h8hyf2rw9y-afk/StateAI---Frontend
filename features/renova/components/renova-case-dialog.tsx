"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Maximize2, Minimize2, Share2, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/features/auth/components/form-error";
import { RenovaCaseForm } from "@/features/renova/components/renova-case-form";
import { RenovaCaseHistory } from "@/features/renova/components/renova-case-history";
import { fieldId } from "@/features/renova/components/renova-form-fields";
import { ENCRYPTION_NOT_CONFIGURED_MESSAGE, advisorLabel, getRenovaErrorMessage } from "@/features/renova/lib/errors";
import {
  emptyRenovaFormValues,
  isRenovaFormDirty,
  toRenovaPayload,
  withInferredProposalType,
  valuesFromRenovaCase,
  type RenovaFormValues,
} from "@/features/renova/lib/form-values";
import { validateRenovaForm, type RenovaFormErrors } from "@/features/renova/lib/validation";
import { applyQuickNotes, quickNotesFieldLabel, redactQuickNotesForAI } from "@/features/renova/lib/quick-notes";
import { useProtectedData } from "@/features/renova/lib/use-protected-data";
import type { RenovaCase } from "@/features/renova/types";
import { createRenovaCase, extractRenovaQuickNotes, getRenovaCase, updateRenovaCase } from "@/lib/api/renova";
import { useUser } from "@/hooks/useUser";
import { useTeamMembers } from "@/features/organization/use-team-members";
import { cn } from "@/lib/utils";

export type RenovaSaveIntent = "draft" | "prospect";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; original: RenovaCase | null };

/**
 * The Renova prospect popup — one dialog for creating AND editing a case.
 *
 * It is mounted by its parent only while it should be visible (see
 * LeadsWorkspace and RenovaCaseDetail), so every opening starts from clean
 * state. Built on the app's own Dialog (Base UI), no parallel modal system.
 *
 *  - Layout: header and footer are fixed; only the body scrolls. Desktop opens
 *    ~900px wide (max 85% of the viewport height) and can be EXPANDED to nearly
 *    the whole viewport (more columns) and collapsed back — same component
 *    instance, so nothing typed is lost. On phones it is already near
 *    full-screen and the expand button is not shown.
 *  - Unsaved changes: closing by any route (Cancelar, X, Escape, clicking
 *    outside) asks for confirmation when the form differs from what it opened
 *    with; it never silently discards.
 *  - Saving: "Guardar borrador" stores the case with status "draft";
 *    "Guardar prospecto" (or "Guardar cambios" when editing) stores it as a
 *    real case (a draft becomes "new"). Both go through the same validation and
 *    the same API calls; buttons are disabled while a request is in flight and
 *    a ref blocks double submits. A failed save keeps everything typed and
 *    shows the backend's outcome in a readable message; a rejected form moves
 *    focus to the first invalid field.
 *  - Edit mode loads the real case first; NSS / número de crédito appear only
 *    as the server's masks and are never pre-filled.
 *  - Advisor: the backend has no endpoint listing an organization's users, so
 *    the only advisor this form can honestly offer is the signed-in user (plus
 *    the case's current one, shown generically, when editing someone else's).
 */
export function RenovaCaseDialog({
  caseId,
  onClose,
  onSaved,
  onShare,
  focusSection,
}: {
  caseId?: string;
  /** Opens the form scrolled to one section (e.g. "propuesta" for "Editar propuesta") instead of the top. */
  focusSection?: "propuesta";
  onClose: () => void;
  onSaved: (renovaCase: RenovaCase, intent: RenovaSaveIntent) => void;
  onShare?: (caseId: string) => void;
}) {
  const isEdit = Boolean(caseId);
  const { user } = useUser();
  const currentUserId = user?.id;
  const members = useTeamMembers();

  const [values, setValues] = useState<RenovaFormValues>(() => emptyRenovaFormValues());
  const [initialValues, setInitialValues] = useState<RenovaFormValues>(() => emptyRenovaFormValues());
  const [load, setLoad] = useState<LoadState>(caseId ? { status: "loading" } : { status: "ready", original: null });
  const [errors, setErrors] = useState<RenovaFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [protectedError, setProtectedError] = useState<string | null>(null);
  const protectedData = useProtectedData(caseId);
  const [expanded, setExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [quickNotes, setQuickNotes] = useState("");
  const [quickNotesResult, setQuickNotesResult] = useState<string | null>(null);
  const [isExtractingNotes, setIsExtractingNotes] = useState(false);
  const submittingRef = useRef(false);
  const isReady = load.status === "ready";

  useEffect(() => {
    if (!focusSection || !isReady) return;
    // After the loaded values render: FormSection titles carry id="renova-section-<id>".
    const frame = requestAnimationFrame(() => {
      document.getElementById(`renova-section-${focusSection}`)?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusSection, isReady]);

  useEffect(() => {
    if (!caseId) return;
    let cancelled = false;
    getRenovaCase(caseId).then((response) => {
      if (cancelled) return;
      if (!response.ok) {
        setLoad({ status: "error", message: getRenovaErrorMessage(response.error) });
        return;
      }
      const loaded = valuesFromRenovaCase(response.data);
      setValues(loaded);
      setInitialValues(loaded);
      setLoad({ status: "ready", original: response.data });
    });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  // A new case defaults to the signed-in user, who may only be known after the dialog opened.
  const withAdvisor = (v: RenovaFormValues): RenovaFormValues =>
    v.assigned_user_id || isEdit ? v : { ...v, assigned_user_id: currentUserId ?? "" };
  const effective = withAdvisor(values);
  const isDirty = isRenovaFormDirty(effective, withAdvisor(initialValues));
  const original = load.status === "ready" ? load.original : null;
  const isDraftCase = isEdit ? original?.status === "draft" : true;

  function set<K extends keyof RenovaFormValues>(field: K, value: RenovaFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function requestClose() {
    if (isSubmitting) return;
    if (isDirty) setConfirmDiscard(true);
    else onClose();
  }

  async function handleQuickNotes() {
    const note = quickNotes.trim();
    if (!note) {
      setQuickNotesResult("Escribe primero lo que obtuviste durante la llamada.");
      return;
    }
    setIsExtractingNotes(true);
    const smartResponse = await extractRenovaQuickNotes(redactQuickNotesForAI(note));
    const result = applyQuickNotes(effective, note, smartResponse.ok ? smartResponse.data : {});
    setIsExtractingNotes(false);
    if (result.values.notes.length > 5000) {
      setQuickNotesResult("La nota supera el límite disponible de 5,000 caracteres.");
      return;
    }
    setValues(result.values);
    setErrors((previous) => {
      const next = { ...previous };
      for (const field of result.applied) delete next[field];
      return next;
    });
    setQuickNotesResult(
      result.applied.length
        ? `${smartResponse.ok ? "IA y validación local" : "Validación local de respaldo"}: ${result.applied.map(quickNotesFieldLabel).join(", ")}. Revisa el expediente antes de guardarlo.`
        : "Guardé el texto en Notas. No reemplacé campos ya capturados; revisa y completa lo que falte."
    );
  }

  async function submit(intent: RenovaSaveIntent) {
    if (submittingRef.current || load.status !== "ready") return;

    const prepared = withInferredProposalType(effective);
    if (prepared.proposal_type !== effective.proposal_type) set("proposal_type", prepared.proposal_type);
    const { errors: found, firstInvalidField } = validateRenovaForm(prepared);
    if (firstInvalidField) {
      setErrors(found);
      setFormError("Revisa los campos marcados antes de guardar.");
      document.getElementById(fieldId(firstInvalidField))?.focus();
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setErrors({});
    setFormError(null);
    setProtectedError(null);

    const status = intent === "draft" ? "draft" : prepared.status === "draft" ? "new" : prepared.status;
    const payload = toRenovaPayload(prepared, isEdit ? "edit" : "create", status);
    const response = caseId ? await updateRenovaCase(caseId, payload) : await createRenovaCase(payload);

    if (!response.ok) {
      submittingRef.current = false;
      setIsSubmitting(false);
      // No encryption key on the server: the failure belongs to the protected-data
      // section, and everything typed stays exactly as it is.
      const sentProtected = "nss" in payload || "credit_number" in payload;
      if (response.error.status === 503 && sentProtected) {
        setProtectedError(ENCRYPTION_NOT_CONFIGURED_MESSAGE);
        requestAnimationFrame(() => document.getElementById("renova-protected-error")?.focus());
      } else {
        setFormError(getRenovaErrorMessage(response.error));
      }
      return;
    }
    onSaved(response.data, intent);
  }

  // Owners/admins can hand a case to any active teammate; everyone else
  // only ever has themselves (and the case's current advisor, if different).
  const teammates = members.filter((m) => m.is_active && m.id !== currentUserId);
  const advisorOptions = [
    ...(currentUserId ? [{ value: currentUserId, label: "Yo (usuario actual)" }] : []),
    ...teammates.map((m) => ({ value: m.id, label: m.email ?? "Asesor sin correo" })),
    ...(effective.assigned_user_id &&
    effective.assigned_user_id !== currentUserId &&
    !teammates.some((m) => m.id === effective.assigned_user_id)
      ? [{ value: effective.assigned_user_id, label: advisorLabel(effective.assigned_user_id, currentUserId, members) }]
      : []),
  ];

  return (
    <Dialog open onOpenChange={(next) => !next && requestClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "surface-panel flex h-[calc(100dvh-1rem)] max-h-none w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-[1.5rem] border-border/65 p-0",
          expanded
            ? "sm:h-[calc(100dvh-2rem)] sm:max-w-[calc(100%-2rem)]"
            : "sm:h-auto sm:max-h-[85dvh] sm:max-w-[min(920px,calc(100%-2rem))]"
        )}
      >
        <DialogHeader className="relative flex-row items-start justify-between gap-4 border-b border-border/55 bg-background/22 px-4 py-4 sm:px-6 sm:py-5">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">
              {isEdit ? "Editando expediente" : "Alta de prospecto"}
            </p>
            <DialogTitle className="truncate text-xl font-semibold tracking-[-0.03em]">
              {isEdit ? original?.owner_name ?? "Expediente Retify" : "Nuevo prospecto Retify"}
            </DialogTitle>
            <DialogDescription>Cliente, contexto, números y propiedad en una sola vista.</DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {caseId && onShare && (
              <Button type="button" variant="outline" size="sm" aria-label="Compartir ficha" onClick={() => onShare(caseId)}>
                <Share2 />
                <span className="hidden sm:inline">Compartir ficha</span>
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="hidden sm:inline-flex"
              aria-label={expanded ? "Contraer formulario" : "Expandir formulario"}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? <Minimize2 /> : <Maximize2 />}
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Cerrar" onClick={requestClose}>
              <X />
            </Button>
          </div>
        </DialogHeader>

        <div className="quiet-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          {load.status === "loading" && (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando expediente…
            </p>
          )}
          {load.status === "error" && <FormError message={load.message} />}
          {load.status === "ready" && (
            <form
              id="renova-case-form"
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                void submit("prospect");
              }}
            >
              <section aria-labelledby="quick-notes-title" className="relative mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.045] p-4 sm:p-5">
                <div className="pointer-events-none absolute -right-10 -top-16 size-40 rounded-full bg-primary/10 blur-3xl" />
                <div className="mb-3 flex items-start gap-2">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <h2 id="quick-notes-title" className="text-sm font-medium">Quick Notes</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Escribe libremente durante la llamada. Detectaremos los datos y guardaremos una copia protegida en Notas.
                    </p>
                  </div>
                </div>
                <Textarea
                  aria-label="Quick Notes de la llamada"
                  rows={4}
                  maxLength={5000}
                  value={quickNotes}
                  placeholder="Ej. Cliente Ana López, celular 8112345678. Propiedad en Río Pánuco 120, colonia Del Valle, municipio San Pedro. Casa dúplex, 2 plantas, 3 recámaras, NSS…"
                  onChange={(event) => {
                    setQuickNotes(event.target.value);
                    setQuickNotesResult(null);
                  }}
                />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p role="status" className="text-xs text-muted-foreground">{quickNotesResult ?? "Los datos sensibles se procesan sólo en este navegador."}</p>
                  <Button type="button" variant="outline" size="sm" disabled={isExtractingNotes} onClick={() => void handleQuickNotes()}>
                    {isExtractingNotes ? <Loader2 className="animate-spin" /> : <Sparkles />} {isExtractingNotes ? "Analizando…" : "Aplicar al expediente"}
                  </Button>
                </div>
              </section>
              <RenovaCaseForm
                values={effective}
                errors={errors}
                expanded={expanded}
                set={set}
                advisorOptions={advisorOptions}
                maskedNss={original?.nss_masked ?? null}
                maskedCreditNumber={original?.credit_number_masked ?? null}
                protectedData={isEdit ? protectedData : null}
                protectedError={protectedError}
                legacyFinalOffer={original && !original.proposal_type ? original.final_offer : null}
              />
              {caseId && (
                <div className="mt-8">
                  <RenovaCaseHistory caseId={caseId} />
                </div>
              )}
            </form>
          )}
        </div>

        <DialogFooter className="m-0 flex-col items-stretch gap-3 rounded-b-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 flex-col gap-2">
            <FormError message={formError} />
            <p className="text-xs text-muted-foreground">* Campos necesarios para crear el expediente</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={requestClose}>
              Cancelar
            </Button>
            {isDraftCase && (
              <Button type="button" variant="outline" disabled={isSubmitting || load.status !== "ready"} onClick={() => void submit("draft")}>
                Guardar borrador
              </Button>
            )}
            <Button type="submit" form="renova-case-form" disabled={isSubmitting || load.status !== "ready"}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isEdit && !isDraftCase ? "Guardar cambios" : "Guardar prospecto"}
            </Button>
          </div>
        </DialogFooter>

        <Dialog open={confirmDiscard} onOpenChange={(next) => !next && setConfirmDiscard(false)}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>¿Descartar los cambios?</DialogTitle>
              <DialogDescription>Tienes cambios sin guardar. Si sales ahora, se perderán.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmDiscard(false)}>
                Seguir editando
              </Button>
              <Button type="button" variant="destructive" onClick={onClose}>
                Descartar cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
