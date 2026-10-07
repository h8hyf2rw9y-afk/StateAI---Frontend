"use client";

import { House, MessageSquareText, Receipt, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import {
  FieldGrid,
  FormSection,
  MoneyField,
  ProtectedIdentifierField,
  RenovaFormProvider,
  SegmentedField,
  SelectField,
  SubHeading,
  TextAreaField,
  TextField,
  ToggleField,
  type RenovaFormState,
} from "@/features/renova/components/renova-form-fields";
import { ProtectedDataControls } from "@/features/renova/components/renova-protected-data";
import { GoogleMapsLink } from "@/features/renova/components/google-maps-link";
import { sumDebts } from "@/features/renova/lib/money";
import type { ProtectedData } from "@/features/renova/lib/use-protected-data";
import {
  RENOVA_DEEDS_STATUSES,
  RENOVA_DWELLING_TYPES,
  RENOVA_MARITAL_STATUSES,
  RENOVA_OCCUPANCY_STATUSES,
  RENOVA_PROPERTY_TAX_DEBT_UNITS,
  RENOVA_PROPOSAL_TYPES,
  RENOVA_STATUSES,
  formatRenovaDeeds,
  formatRenovaDwelling,
  formatRenovaMaritalStatus,
  formatRenovaMoney,
  formatRenovaOccupancy,
  formatRenovaPropertyTaxDebtUnit,
  formatRenovaProposalType,
  formatRenovaStatus,
} from "@/features/renova/types";

const toOptions = <T extends string>(values: readonly T[], format: (value: T) => string) =>
  values.map((value) => ({ value, label: format(value) }));

export interface RenovaCaseFormProps extends RenovaFormState {
  advisorOptions: { value: string; label: string }[];
  /** The server's masks ("••••1234") when editing a saved case; the full values are never available. */
  maskedNss: string | null;
  maskedCreditNumber: string | null;
  /** The temporary reveal of the stored values (edit mode with something stored); null otherwise. */
  protectedData: ProtectedData | null;
  /** Shown inside the protected-data section, e.g. when the server has no encryption key configured. */
  protectedError: string | null;
  /** Set only when the loaded case predates the structured proposal model (proposal_type is null) AND still carries an ambiguous historical total — shown as a "needs classification" note, never auto-split into the new fields. */
  legacyFinalOffer: string | null;
}

/**
 * The Renova prospect form: ONE continuous, ordered form — no tabs, no steps,
 * no accordions. Purely presentational: values, errors and `set` come from
 * the dialog (renova-case-dialog.tsx), so create and edit share this exact
 * component, layout, validation and money handling.
 *
 * Each section is a small title with a discreet icon and a thin rule; fields
 * sit directly on the dialog surface (no per-field cards). The debt total is
 * computed here from the five debt fields as they are typed and is never
 * stored — the server derives the authoritative `total_debt`.
 */
export function RenovaCaseForm({
  advisorOptions,
  maskedNss,
  maskedCreditNumber,
  protectedData,
  protectedError,
  legacyFinalOffer,
  ...state
}: RenovaCaseFormProps) {
  const propertyTaxDebtInYears = state.values.property_tax_debt_unit === "years";
  // Years and pesos can't be summed — a years-unit value never enters the live total (the server excludes it from total_debt the same way).
  const debtTotal = sumDebts(propertyTaxDebtInYears ? { ...state.values, property_tax_debt: "" } : state.values);

  // The three proposal amount fields are shown unconditionally (the form
  // never hides $0 — see the task's own note); the total below is computed
  // the SAME way the backend computes total_proposal_value, purely for live
  // display — the server's figure, returned on save, is the authoritative one.
  const proposalType = state.values.proposal_type;
  const coverageAmount = state.values.debt_coverage_amount.trim() ? Number(state.values.debt_coverage_amount) : null;
  const cashAmount = state.values.owner_cash_offer.trim() ? Number(state.values.owner_cash_offer) : null;
  const proposalTotal =
    coverageAmount === null && cashAmount === null ? null : (coverageAmount ?? 0) + (cashAmount ?? 0);
  const coverageMismatchesKnownDebt =
    proposalType && coverageAmount !== null && debtTotal !== null && coverageAmount !== debtTotal;
  // "Borrador" is a system state (it is what "Guardar borrador" sets), so it is only offered while the case still is one.
  const statusOptions = toOptions(
    RENOVA_STATUSES.filter((status) => status !== "draft" || state.values.status === "draft"),
    formatRenovaStatus
  );

  return (
    <RenovaFormProvider value={state}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">Expediente Retify</p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.025em]">Datos del expediente</h2>
          </div>
          <p className="hidden max-w-xs text-right text-xs leading-relaxed text-muted-foreground sm:block">
            Captura primero a la persona y su contexto; después completa números y propiedad.
          </p>
        </div>

        <FormSection id="cliente" title="Cliente" icon={UserRound}>
          <FieldGrid>
            <TextField name="owner_name" label="Nombre completo del titular" size="half" required />
            <TextField name="owner_phone" label="Celular del titular" size="half" inputMode="tel" required />
            <SelectField
              name="marital_status"
              label="Estado civil al adquirir el inmueble"
              allowNone
              placeholder="Sin especificar"
              options={toOptions(RENOVA_MARITAL_STATUSES, formatRenovaMaritalStatus)}
            />
            {protectedData && (maskedNss !== null || maskedCreditNumber !== null) && (
              <div className="sm:col-span-6 lg:col-span-12">
                <ProtectedDataControls protectedData={protectedData} />
              </div>
            )}
            <ProtectedIdentifierField
              name="nss"
              clearFlag="clear_nss"
              label="NSS"
              helper="11 dígitos. Se almacenará cifrado."
              masked={maskedNss}
              revealed={protectedData?.values?.nss ?? null}
            />
            <ProtectedIdentifierField
              name="credit_number"
              clearFlag="clear_credit_number"
              label="Número de crédito"
              helper="Se almacenará cifrado y no aparecerá en la ficha compartible."
              masked={maskedCreditNumber}
              revealed={protectedData?.values?.credit_number ?? null}
            />
            <SubHeading>Cónyuge</SubHeading>
            <TextField name="spouse_name" label="Nombre completo del cónyuge" size="half" />
            <TextField name="spouse_phone" label="Celular del cónyuge" size="half" inputMode="tel" />
          </FieldGrid>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            NSS y número de crédito son datos protegidos. Puedes incluirlos expresamente al preparar la ficha compartible.
          </p>
          {protectedError && (
            <p id="renova-protected-error" role="alert" tabIndex={-1} className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {protectedError}
            </p>
          )}
        </FormSection>

        <FormSection id="comentarios" title="Comentarios y contexto" icon={MessageSquareText}>
          <FieldGrid>
            <TextAreaField name="notes" label="Notas adicionales o contexto de la conversación" />
            <TextAreaField name="general_situation" label="Comentarios generales" />
            <TextAreaField name="sale_reason" label="¿Por qué la quiere vender?" />
            <TextAreaField name="conditions" label="Condiciones de la casa" />
          </FieldGrid>
        </FormSection>

        <FormSection id="adeudos" title="Adeudos y propuesta" icon={Receipt}>
          <div aria-live="polite" data-testid="debt-total" className="flex flex-col gap-1 rounded-xl border border-primary/15 bg-primary/[0.045] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">Total estimado de adeudos</span>
            <span className="text-lg font-semibold tracking-[-0.025em] text-foreground">
              {debtTotal === null ? "—" : `${formatRenovaMoney(debtTotal)} MXN`}
            </span>
          </div>

          {legacyFinalOffer !== null && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Propuesta histórica registrada: <strong>{formatRenovaMoney(legacyFinalOffer)}</strong>. Selecciona una modalidad
              abajo para clasificarla como cobertura de deuda y/o efectivo.
            </p>
          )}

          <SubHeading>Propuesta</SubHeading>
          <FieldGrid>
            <SegmentedField
              name="proposal_type"
              label="Modalidad de la propuesta"
              size="half"
              allowClear
              options={toOptions(RENOVA_PROPOSAL_TYPES, formatRenovaProposalType)}
            />
            <MoneyField name="debt_coverage_amount" label="Deuda que cubrirá Retify" size="half" />
            <MoneyField name="owner_cash_offer" label="Efectivo para el propietario" size="half" />
          </FieldGrid>
          <div
            aria-live="polite"
            data-testid="proposal-total"
            className="flex flex-col gap-1 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-xs text-muted-foreground">Valor total de la propuesta (solo lectura)</span>
            <span className="text-lg font-semibold tracking-[-0.025em] text-foreground">
              {proposalTotal === null ? "—" : `${formatRenovaMoney(proposalTotal)} MXN`}
            </span>
          </div>
          {coverageMismatchesKnownDebt && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              La cobertura propuesta ({formatRenovaMoney(coverageAmount)}) no coincide con la deuda total conocida (
              {formatRenovaMoney(debtTotal)}). Esto no bloquea la propuesta, solo revísalo antes de confirmar.
            </p>
          )}

          <SubHeading>Otros montos</SubHeading>
          <FieldGrid>
            <MoneyField name="market_value" label="Valor de mercado" />
            <MoneyField name="owner_expected_amount" label="Cuánto espera recibir" />
            <SegmentedField
              name="property_tax_debt_unit"
              label="Deuda predial — ¿en pesos o en años?"
              size="sm"
              options={toOptions(RENOVA_PROPERTY_TAX_DEBT_UNITS, formatRenovaPropertyTaxDebtUnit)}
            />
            {propertyTaxDebtInYears ? (
              <TextField name="property_tax_debt" label="Deuda predial (años)" type="number" size="sm" hint="Años que se deben de predial, no el monto en pesos." />
            ) : (
              <MoneyField name="property_tax_debt" label="Deuda predial" />
            )}
            <MoneyField name="other_debt" label="Adeudo" />
            <MoneyField name="water_debt" label="Deuda de agua" />
            <MoneyField name="electricity_debt" label="Deuda de luz" />
            <MoneyField name="gas_debt" label="Deuda de gas" />
            <TextField name="debt_owed_to" label="A quién se debe" />
          </FieldGrid>
        </FormSection>

        <FormSection id="propiedad" title="Propiedad" icon={House}>
          <FieldGrid>
            <TextField name="street_address" label="Calle y número" size="half" />
            <TextField name="neighborhood" label="Colonia" size="half" />
            <TextField name="municipality" label="Municipio" />
            <TextField name="postal_code" label="Código postal" inputMode="numeric" />
            {/* Live as the address is typed, so it can be checked on the map before saving. */}
            <GoogleMapsLink address={state.values} className="sm:col-span-6 lg:col-span-12" />
            <SegmentedField
              name="dwelling_type"
              label="Tipo de vivienda"
              size="sm"
              allowClear
              options={toOptions(RENOVA_DWELLING_TYPES, formatRenovaDwelling)}
            />
            <ToggleField name="is_duplex" label="Dúplex" size="xs" />
            <TextField name="floors" label="Plantas" type="number" size="xs" />
            <TextField name="bathrooms" label="Baños" type="number" size="xs" />
            <TextField name="bedrooms" label="Recámaras" type="number" size="xs" />
            <SegmentedField
              name="occupancy_status"
              label="Situación actual"
              size="half"
              allowClear
              options={toOptions(RENOVA_OCCUPANCY_STATUSES, formatRenovaOccupancy)}
            />
            <SegmentedField name="has_deeds" label="Escrituras" size="half" options={toOptions(RENOVA_DEEDS_STATUSES, formatRenovaDeeds)} />
            <TextField name="deeds_holder_name" label="A nombre de quién están las escrituras" size="half" />
          </FieldGrid>
        </FormSection>

        <FormSection id="control" title="Control del expediente" icon={SlidersHorizontal}>
          <FieldGrid>
            <SelectField name="assigned_user_id" label="Asesor responsable" required options={advisorOptions} placeholder="Selecciona un asesor" />
            <TextField name="entry_date" label="Fecha de ingreso" type="date" required />
            <SelectField name="status" label="Estado del expediente" options={statusOptions} />
          </FieldGrid>
        </FormSection>
      </div>
    </RenovaFormProvider>
  );
}
