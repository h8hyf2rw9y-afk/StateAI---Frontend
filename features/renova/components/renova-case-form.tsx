"use client";

import { ClipboardList, FileText, MapPin, MessageCircleQuestion, Receipt, ShieldCheck, Users } from "lucide-react";
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
import { sumDebts } from "@/features/renova/lib/money";
import type { ProtectedData } from "@/features/renova/lib/use-protected-data";
import {
  RENOVA_DEEDS_STATUSES,
  RENOVA_DWELLING_TYPES,
  RENOVA_MARITAL_STATUSES,
  RENOVA_OCCUPANCY_STATUSES,
  RENOVA_PROPERTY_TAX_DEBT_UNITS,
  RENOVA_STATUSES,
  formatRenovaDeeds,
  formatRenovaDwelling,
  formatRenovaMaritalStatus,
  formatRenovaMoney,
  formatRenovaOccupancy,
  formatRenovaPropertyTaxDebtUnit,
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
  ...state
}: RenovaCaseFormProps) {
  const propertyTaxDebtInYears = state.values.property_tax_debt_unit === "years";
  // Years and pesos can't be summed — a years-unit value never enters the live total (the server excludes it from total_debt the same way).
  const debtTotal = sumDebts(propertyTaxDebtInYears ? { ...state.values, property_tax_debt: "" } : state.values);
  // "Borrador" is a system state (it is what "Guardar borrador" sets), so it is only offered while the case still is one.
  const statusOptions = toOptions(
    RENOVA_STATUSES.filter((status) => status !== "draft" || state.values.status === "draft"),
    formatRenovaStatus
  );

  return (
    <RenovaFormProvider value={state}>
      <div className="flex flex-col gap-8">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Datos del expediente</h2>

        <FormSection id="registro" title="Registro y propuesta" icon={FileText}>
          <FieldGrid>
            <SelectField name="assigned_user_id" label="Asesor responsable" required options={advisorOptions} placeholder="Selecciona un asesor" />
            <TextField name="entry_date" label="Fecha de ingreso" type="date" required />
            <SelectField name="status" label="Estado del expediente" options={statusOptions} />
            <MoneyField name="final_offer" label="Propuesta final" />
            <MoneyField name="market_value" label="Valor de mercado" />
            <MoneyField name="owner_expected_amount" label="Cuánto espera recibir" />
          </FieldGrid>
        </FormSection>

        <FormSection id="ubicacion" title="Ubicación e inmueble" icon={MapPin}>
          <FieldGrid>
            <TextField name="street_address" label="Calle y número" size="half" />
            <TextField name="neighborhood" label="Colonia" size="half" />
            <TextField name="municipality" label="Municipio" />
            <TextField name="postal_code" label="Código postal" inputMode="numeric" />
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
          </FieldGrid>
        </FormSection>

        <FormSection id="adeudos" title="Adeudos" icon={Receipt}>
          <FieldGrid>
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
          <p aria-live="polite" className="text-sm text-muted-foreground" data-testid="debt-total">
            Total estimado de adeudos:{" "}
            <span className="font-medium text-foreground">{debtTotal === null ? "—" : `${formatRenovaMoney(debtTotal)} MXN`}</span>
          </p>
        </FormSection>

        <FormSection id="condicion" title="Condición y situación" icon={ClipboardList}>
          <FieldGrid>
            <TextAreaField name="conditions" label="Condiciones de la casa" />
            <SegmentedField
              name="occupancy_status"
              label="Situación actual"
              size="half"
              allowClear
              options={toOptions(RENOVA_OCCUPANCY_STATUSES, formatRenovaOccupancy)}
            />
            <SegmentedField name="has_deeds" label="Escrituras" size="half" options={toOptions(RENOVA_DEEDS_STATUSES, formatRenovaDeeds)} />
            <TextField name="deeds_holder_name" label="A nombre de quién están las escrituras" size="half" />
            <TextAreaField name="general_situation" label="Comentarios generales" />
          </FieldGrid>
        </FormSection>

        <FormSection id="titular" title="Titular y cónyuge" icon={Users}>
          <FieldGrid>
            <SubHeading>Titular</SubHeading>
            <TextField name="owner_name" label="Nombre completo del titular" required />
            <TextField name="owner_phone" label="Celular del titular" inputMode="tel" required />
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
            <TextField name="spouse_name" label="Nombre completo del cónyuge" />
            <TextField name="spouse_phone" label="Celular del cónyuge" inputMode="tel" />
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

        <FormSection id="preguntas" title="Preguntas clave" icon={MessageCircleQuestion}>
          <FieldGrid>
            <TextAreaField name="sale_reason" label="¿Por qué la quiere vender?" />
            <TextAreaField name="notes" label="Notas adicionales o contexto de la conversación" />
          </FieldGrid>
        </FormSection>
      </div>
    </RenovaFormProvider>
  );
}
