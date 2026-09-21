"use client";

import { useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormError } from "@/features/auth/components/form-error";
import { createRenovaCase, getRenovaCase, updateRenovaCase } from "@/lib/api/renova";
import { useUser } from "@/hooks/useUser";
import { advisorLabel, getRenovaErrorMessage } from "@/features/renova/lib";
import {
  MONEY_FIELDS,
  RENOVA_FORM_STEPS,
  emptyRenovaFormValues,
  sumFormDebts,
  toRenovaPayload,
  validateRenovaForm,
  valuesFromRenovaCase,
  type RenovaFormErrors,
  type RenovaFormValues,
} from "@/features/renova/form-utils";
import {
  RENOVA_DEEDS_STATUSES,
  RENOVA_DWELLING_TYPES,
  RENOVA_MARITAL_STATUSES,
  RENOVA_SOURCES,
  RENOVA_STATUSES,
  formatRenovaDeeds,
  formatRenovaDwelling,
  formatRenovaMaritalStatus,
  formatRenovaMoney,
  formatRenovaSource,
  formatRenovaStatus,
  type RenovaCase,
} from "@/features/renova/types";
import { cn } from "@/lib/utils";

const NONE = "__none__";

function Field({
  id,
  label,
  error,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * One dialog for creating AND editing a Renova case, split into five steps
 * (Registro / Propietario / Inmueble / Finanzas / Motivación y evaluación)
 * so a phone never shows more than one section's fields at once.
 *
 * A case is normally logged from a WhatsApp conversation while details are
 * still missing, so "Guardar" is available on EVERY step — only owner name,
 * phone, entry date and advisor are required (see validateRenovaForm); the
 * proposal, market value, debts, spouse data, NSS and credit number can all
 * be filled in later. If validation fails the form jumps to the first step
 * with a problem.
 *
 * NSS and credit number are write-only inputs. When editing, the saved value
 * is shown only as its mask (the full value never leaves the server) and
 * typing replaces it; a "Quitar" button deletes it. Neither value is ever
 * pre-filled, logged, or placed in a query string.
 *
 * Advisor: the backend exposes no list of an organization's users, so the
 * only advisor this form can honestly offer is the signed-in user (plus the
 * case's current one, shown generically, when editing someone else's case).
 */
export function RenovaCaseForm({
  caseId,
  trigger,
  onSaved,
}: {
  caseId?: string;
  trigger: ReactElement;
  onSaved?: (renovaCase: RenovaCase) => void;
}) {
  const isEdit = Boolean(caseId);
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<RenovaFormValues>(() => emptyRenovaFormValues());
  const [original, setOriginal] = useState<RenovaCase | null>(null);
  const [errors, setErrors] = useState<RenovaFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const currentUserId = user?.id;

  function set<K extends keyof RenovaFormValues>(field: K, value: RenovaFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;

    setStep(0);
    setErrors({});
    setFormError(null);
    setOriginal(null);

    if (!caseId) {
      setValues(emptyRenovaFormValues(currentUserId ?? ""));
      return;
    }

    // Editing: the list is deliberately lean, so load the full case first.
    setLoading(true);
    const response = await getRenovaCase(caseId);
    setLoading(false);
    if (!response.ok) {
      setFormError(getRenovaErrorMessage(response.error));
      return;
    }
    setOriginal(response.data);
    setValues(valuesFromRenovaCase(response.data));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || loading) return;

    // The user may have opened "new" before the session finished loading.
    const effective = values.assigned_user_id ? values : { ...values, assigned_user_id: currentUserId ?? "" };
    const { errors: found, firstStep } = validateRenovaForm(effective);
    if (firstStep !== null) {
      setErrors(found);
      setStep(firstStep);
      setFormError("Revisa los campos marcados antes de guardar.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    const payload = toRenovaPayload(effective, isEdit ? "edit" : "create");
    const response = caseId ? await updateRenovaCase(caseId, payload) : await createRenovaCase(payload);
    setIsSubmitting(false);

    if (!response.ok) {
      setFormError(getRenovaErrorMessage(response.error));
      return;
    }
    onSaved?.(response.data);
    setOpen(false);
  }

  const advisorOptions = [
    ...(currentUserId ? [{ id: currentUserId, label: "Yo (usuario actual)" }] : []),
    ...(values.assigned_user_id && values.assigned_user_id !== currentUserId
      ? [{ id: values.assigned_user_id, label: advisorLabel(values.assigned_user_id, currentUserId) }]
      : []),
  ];
  const debtTotal = sumFormDebts(values);
  const isLastStep = step === RENOVA_FORM_STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar expediente Renova" : "Nuevo prospecto Renova"}</DialogTitle>
        </DialogHeader>

        <ol className="flex gap-1 overflow-x-auto" aria-label="Secciones del formulario">
          {RENOVA_FORM_STEPS.map((label, index) => (
            <li key={label} className="flex-1">
              <button
                type="button"
                onClick={() => setStep(index)}
                aria-current={index === step ? "step" : undefined}
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                  index === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {index + 1}. {label}
              </button>
            </li>
          ))}
        </ol>

        {loading ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando expediente…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <FormError message={formError} />

            {step === 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field id="assigned_user_id" label="Asesor responsable" required error={errors.assigned_user_id}>
                  <Select
                    value={values.assigned_user_id || NONE}
                    onValueChange={(v) => set("assigned_user_id", !v || v === NONE ? "" : v)}
                  >
                    <SelectTrigger id="assigned_user_id" aria-label="Asesor responsable">
                      <SelectValue>
                        {(value: string | null) =>
                          !value || value === NONE
                            ? "Selecciona un asesor"
                            : (advisorOptions.find((o) => o.id === value)?.label ?? advisorLabel(value, currentUserId))
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {advisorOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="entry_date" label="Fecha de ingreso" required error={errors.entry_date}>
                  <Input id="entry_date" type="date" value={values.entry_date} onChange={(e) => set("entry_date", e.target.value)} />
                </Field>
                <Field id="source" label="Fuente">
                  <Select value={values.source} onValueChange={(v) => v && set("source", v)}>
                    <SelectTrigger id="source" aria-label="Fuente">
                      <SelectValue>{(v: string | null) => formatRenovaSource(v ?? values.source)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {RENOVA_SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {formatRenovaSource(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="status" label="Estado del expediente">
                  <Select value={values.status} onValueChange={(v) => v && set("status", v)}>
                    <SelectTrigger id="status" aria-label="Estado del expediente">
                      <SelectValue>{(v: string | null) => formatRenovaStatus(v ?? values.status)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {RENOVA_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {formatRenovaStatus(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}

            {step === 1 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field id="owner_name" label="Nombre del titular" required error={errors.owner_name}>
                  <Input id="owner_name" value={values.owner_name} onChange={(e) => set("owner_name", e.target.value)} />
                </Field>
                <Field id="owner_phone" label="Celular" required error={errors.owner_phone}>
                  <Input id="owner_phone" inputMode="tel" value={values.owner_phone} onChange={(e) => set("owner_phone", e.target.value)} />
                </Field>
                <Field id="marital_status" label="Estado civil al adquirir el inmueble">
                  <Select
                    value={values.marital_status || NONE}
                    onValueChange={(v) => set("marital_status", !v || v === NONE ? "" : v)}
                  >
                    <SelectTrigger id="marital_status" aria-label="Estado civil al adquirir el inmueble">
                      <SelectValue>
                        {(v: string | null) => (!v || v === NONE ? "Sin especificar" : formatRenovaMaritalStatus(v))}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sin especificar</SelectItem>
                      {RENOVA_MARITAL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {formatRenovaMaritalStatus(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="hidden sm:block" />
                <Field id="spouse_name" label="Nombre del cónyuge (opcional)" error={errors.spouse_name}>
                  <Input id="spouse_name" value={values.spouse_name} onChange={(e) => set("spouse_name", e.target.value)} />
                </Field>
                <Field id="spouse_phone" label="Celular del cónyuge (opcional)" error={errors.spouse_phone}>
                  <Input id="spouse_phone" inputMode="tel" value={values.spouse_phone} onChange={(e) => set("spouse_phone", e.target.value)} />
                </Field>
                <SecretField
                  id="nss"
                  label="NSS (opcional)"
                  masked={original?.nss_masked ?? null}
                  value={values.nss}
                  cleared={values.clear_nss}
                  error={errors.nss}
                  onChange={(v) => set("nss", v)}
                  onClear={(cleared) => {
                    set("clear_nss", cleared);
                    if (cleared) set("nss", "");
                  }}
                />
                <SecretField
                  id="credit_number"
                  label="Número de crédito (opcional)"
                  masked={original?.credit_number_masked ?? null}
                  value={values.credit_number}
                  cleared={values.clear_credit_number}
                  error={errors.credit_number}
                  onChange={(v) => set("credit_number", v)}
                  onClear={(cleared) => {
                    set("clear_credit_number", cleared);
                    if (cleared) set("credit_number", "");
                  }}
                />
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field id="dwelling_type" label="Tipo de vivienda">
                  <Select
                    value={values.dwelling_type || NONE}
                    onValueChange={(v) => set("dwelling_type", !v || v === NONE ? "" : v)}
                  >
                    <SelectTrigger id="dwelling_type" aria-label="Tipo de vivienda">
                      <SelectValue>{(v: string | null) => (!v || v === NONE ? "Sin especificar" : formatRenovaDwelling(v))}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Sin especificar</SelectItem>
                      {RENOVA_DWELLING_TYPES.map((d) => (
                        <SelectItem key={d} value={d}>
                          {formatRenovaDwelling(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="floors" label="Número de plantas" error={errors.floors}>
                  <Input id="floors" type="number" min="0" step="1" value={values.floors} onChange={(e) => set("floors", e.target.value)} />
                </Field>
                <Field id="bedrooms" label="Número de recámaras" error={errors.bedrooms}>
                  <Input id="bedrooms" type="number" min="0" step="1" value={values.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} />
                </Field>
                <Field id="bathrooms" label="Número de baños" error={errors.bathrooms} hint="Puedes usar medios baños (1.5).">
                  <Input id="bathrooms" type="number" min="0" step="0.5" value={values.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} />
                </Field>
                <div className="sm:col-span-2">
                  <Field id="conditions" label="Condiciones de la vivienda" error={errors.conditions}>
                    <Textarea id="conditions" rows={3} value={values.conditions} onChange={(e) => set("conditions", e.target.value)} />
                  </Field>
                </div>
                <Field id="has_deeds" label="¿Tiene escrituras?">
                  <Select value={values.has_deeds} onValueChange={(v) => v && set("has_deeds", v)}>
                    <SelectTrigger id="has_deeds" aria-label="¿Tiene escrituras?">
                      <SelectValue>{(v: string | null) => formatRenovaDeeds(v ?? values.has_deeds)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {RENOVA_DEEDS_STATUSES.map((d) => (
                        <SelectItem key={d} value={d}>
                          {formatRenovaDeeds(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="deeds_holder_name" label="Escrituras a nombre de" error={errors.deeds_holder_name}>
                  <Input id="deeds_holder_name" value={values.deeds_holder_name} onChange={(e) => set("deeds_holder_name", e.target.value)} />
                </Field>
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MoneyField id="market_value" label="Valor de mercado" values={values} errors={errors} set={set} />
                <MoneyField id="owner_expected_amount" label="Cuánto espera recibir el propietario" values={values} errors={errors} set={set} />
                <MoneyField id="final_offer" label="Propuesta final" values={values} errors={errors} set={set} />
                <div className="hidden sm:block" />
                <MoneyField id="property_tax_debt" label="Deuda predial" values={values} errors={errors} set={set} />
                <MoneyField id="water_debt" label="Deuda de agua" values={values} errors={errors} set={set} />
                <MoneyField id="electricity_debt" label="Deuda de luz" values={values} errors={errors} set={set} />
                <MoneyField id="gas_debt" label="Deuda de gas" values={values} errors={errors} set={set} />
                <MoneyField id="other_debt" label="Otros adeudos" values={values} errors={errors} set={set} />
                <Field id="debt_owed_to" label="A quién se debe" error={errors.debt_owed_to}>
                  <Input id="debt_owed_to" value={values.debt_owed_to} onChange={(e) => set("debt_owed_to", e.target.value)} />
                </Field>
                <div className="rounded-lg border bg-muted/30 p-3 sm:col-span-2" aria-live="polite">
                  <p className="text-xs text-muted-foreground">Adeudos totales (predial + otros + agua + luz + gas)</p>
                  <p className="text-lg font-semibold" data-testid="debt-total">
                    {debtTotal === null ? "—" : formatRenovaMoney(debtTotal)}
                  </p>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="flex flex-col gap-3">
                <Field id="sale_reason" label="Razón por la que quiere vender" error={errors.sale_reason}>
                  <Textarea id="sale_reason" rows={3} value={values.sale_reason} onChange={(e) => set("sale_reason", e.target.value)} />
                </Field>
                <Field id="key_questions" label="Preguntas clave" error={errors.key_questions}>
                  <Textarea id="key_questions" rows={3} value={values.key_questions} onChange={(e) => set("key_questions", e.target.value)} />
                </Field>
                <Field id="general_situation" label="Situación general" error={errors.general_situation}>
                  <Textarea id="general_situation" rows={3} value={values.general_situation} onChange={(e) => set("general_situation", e.target.value)} />
                </Field>
                <Field id="notes" label="Notas adicionales" error={errors.notes}>
                  <Textarea id="notes" rows={3} value={values.notes} onChange={(e) => set("notes", e.target.value)} />
                </Field>
              </div>
            )}

            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <div className="flex gap-2">
                <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
                  Anterior
                </Button>
                {!isLastStep && (
                  <Button type="button" variant="outline" onClick={() => setStep((s) => Math.min(RENOVA_FORM_STEPS.length - 1, s + 1))}>
                    Siguiente
                  </Button>
                )}
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isEdit ? "Guardar cambios" : "Guardar prospecto"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MoneyField({
  id,
  label,
  values,
  errors,
  set,
}: {
  id: (typeof MONEY_FIELDS)[number];
  label: string;
  values: RenovaFormValues;
  errors: RenovaFormErrors;
  set: <K extends keyof RenovaFormValues>(field: K, value: RenovaFormValues[K]) => void;
}) {
  return (
    <Field id={id} label={`${label} (MXN)`} error={errors[id]}>
      <Input id={id} type="number" inputMode="decimal" min="0" step="0.01" value={values[id]} onChange={(e) => set(id, e.target.value)} />
    </Field>
  );
}

/**
 * A sensitive identifier input. `autoComplete="off"` and type="password"-style
 * masking keep the browser from remembering or echoing it; when editing, only
 * the mask of the saved value is ever displayed.
 */
function SecretField({
  id,
  label,
  masked,
  value,
  cleared,
  error,
  onChange,
  onClear,
}: {
  id: string;
  label: string;
  masked: string | null;
  value: string;
  cleared: boolean;
  error?: string;
  onChange: (value: string) => void;
  onClear: (cleared: boolean) => void;
}) {
  return (
    <Field
      id={id}
      label={label}
      error={error}
      hint={masked && !cleared ? `Guardado: ${masked}. Escribe para reemplazarlo.` : cleared ? "Se eliminará al guardar." : undefined}
    >
      <div className="flex gap-2">
        <Input
          id={id}
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={value}
          disabled={cleared}
          placeholder={masked && !cleared ? masked : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {masked && (
          <Button type="button" variant="outline" size="sm" onClick={() => onClear(!cleared)} className="shrink-0">
            {cleared ? "Deshacer" : "Quitar"}
          </Button>
        )}
      </div>
    </Field>
  );
}
