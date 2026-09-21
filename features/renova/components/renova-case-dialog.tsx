"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Maximize2, Minimize2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { RenovaCaseForm } from "@/features/renova/components/renova-case-form";
import { fieldId } from "@/features/renova/components/renova-form-fields";
import { ENCRYPTION_NOT_CONFIGURED_MESSAGE, advisorLabel, getRenovaErrorMessage } from "@/features/renova/lib/errors";
import {
  emptyRenovaFormValues,
  isRenovaFormDirty,
  toRenovaPayload,
  valuesFromRenovaCase,
  type RenovaFormValues,
} from "@/features/renova/lib/form-values";
import { validateRenovaForm, type RenovaFormErrors } from "@/features/renova/lib/validation";
import { useProtectedData } from "@/features/renova/lib/use-protected-data";
import type { RenovaCase } from "@/features/renova/types";
import { createRenovaCase, getRenovaCase, updateRenovaCase } from "@/lib/api/renova";
import { useUser } from "@/hooks/useUser";
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
}: {
  caseId?: string;
  onClose: () => void;
  onSaved: (renovaCase: RenovaCase, intent: RenovaSaveIntent) => void;
}) {
  const isEdit = Boolean(caseId);
  const { user } = useUser();
  const currentUserId = user?.id;

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
  const submittingRef = useRef(false);

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

  async function submit(intent: RenovaSaveIntent) {
    if (submittingRef.current || load.status !== "ready") return;

    const { errors: found, firstInvalidField } = validateRenovaForm(effective);
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

    const status = intent === "draft" ? "draft" : effective.status === "draft" ? "new" : effective.status;
    const payload = toRenovaPayload(effective, isEdit ? "edit" : "create", status);
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

  const advisorOptions = [
    ...(currentUserId ? [{ value: currentUserId, label: "Yo (usuario actual)" }] : []),
    ...(effective.assigned_user_id && effective.assigned_user_id !== currentUserId
      ? [{ value: effective.assigned_user_id, label: advisorLabel(effective.assigned_user_id, currentUserId) }]
      : []),
  ];

  return (
    <Dialog open onOpenChange={(next) => !next && requestClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex h-[calc(100dvh-1rem)] max-h-none w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0",
          expanded
            ? "sm:h-[calc(100dvh-2rem)] sm:max-w-[calc(100%-2rem)]"
            : "sm:h-auto sm:max-h-[85dvh] sm:max-w-[min(920px,calc(100%-2rem))]"
        )}
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 border-b px-4 py-4 sm:px-6">
          <div className="flex min-w-0 flex-col gap-1.5">
            <DialogTitle className="text-lg">{isEdit ? "Editar prospecto Renova" : "Nuevo prospecto Renova"}</DialogTitle>
            <DialogDescription>Captura el expediente de compra potencial en un solo formulario.</DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
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
              />
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
