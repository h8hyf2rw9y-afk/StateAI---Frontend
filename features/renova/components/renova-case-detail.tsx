"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FormError } from "@/features/auth/components/form-error";
import { getRenovaCase } from "@/lib/api/renova";
import { useUser } from "@/hooks/useUser";
import { advisorLabel, getRenovaErrorMessage } from "@/features/renova/lib";
import {
  formatRenovaDate,
  formatRenovaDeeds,
  formatRenovaDwelling,
  formatRenovaMaritalStatus,
  formatRenovaMoney,
  formatRenovaSource,
  formatRenovaStatus,
  getRenovaStatusClassName,
  type RenovaCase,
} from "@/features/renova/types";
import { cn } from "@/lib/utils";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Row({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words whitespace-pre-wrap">{children || "—"}</dd>
    </div>
  );
}

/**
 * Read-only view of one Renova case ("Abrir"). Loads the full case when it
 * opens — the list rows are deliberately lean. NSS and número de crédito
 * appear ONLY as the server's masked strings ("••••1234"); the full values
 * are not retrievable through the API, so they cannot be shown here.
 */
export function RenovaCaseDetail({ caseId, trigger }: { caseId: string; trigger: ReactElement }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [renovaCase, setRenovaCase] = useState<RenovaCase | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setLoading(true);
    setError(null);
    setRenovaCase(null);
    const response = await getRenovaCase(caseId);
    setLoading(false);
    if (!response.ok) {
      setError(getRenovaErrorMessage(response.error));
      return;
    }
    setRenovaCase(response.data);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{renovaCase ? renovaCase.owner_name : "Expediente Renova"}</DialogTitle>
        </DialogHeader>

        {loading && (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Cargando expediente…
          </p>
        )}
        <FormError message={error} />

        {renovaCase && (
          <div className="flex flex-col gap-5">
            <Section title="Registro">
              <Row label="Estado">
                <Badge variant="outline" className={cn("border-transparent", getRenovaStatusClassName(renovaCase.status))}>
                  {formatRenovaStatus(renovaCase.status)}
                </Badge>
              </Row>
              <Row label="Fecha de ingreso">{formatRenovaDate(renovaCase.entry_date)}</Row>
              <Row label="Asesor responsable">{advisorLabel(renovaCase.assigned_user_id, user?.id)}</Row>
              <Row label="Fuente">{formatRenovaSource(renovaCase.source)}</Row>
            </Section>

            <Section title="Propietario">
              <Row label="Nombre del titular">{renovaCase.owner_name}</Row>
              <Row label="Celular">{renovaCase.owner_phone}</Row>
              <Row label="Estado civil al adquirir el inmueble">{formatRenovaMaritalStatus(renovaCase.marital_status)}</Row>
              <Row label="Cónyuge">{renovaCase.spouse_name}</Row>
              <Row label="Celular del cónyuge">{renovaCase.spouse_phone}</Row>
              <Row label="NSS">{renovaCase.nss_masked ?? "No registrado"}</Row>
              <Row label="Número de crédito">{renovaCase.credit_number_masked ?? "No registrado"}</Row>
            </Section>

            <Section title="Inmueble">
              <Row label="Tipo de vivienda">{formatRenovaDwelling(renovaCase.dwelling_type)}</Row>
              <Row label="Plantas">{renovaCase.floors}</Row>
              <Row label="Recámaras">{renovaCase.bedrooms}</Row>
              <Row label="Baños">{renovaCase.bathrooms}</Row>
              <Row label="¿Tiene escrituras?">{formatRenovaDeeds(renovaCase.has_deeds)}</Row>
              <Row label="Escrituras a nombre de">{renovaCase.deeds_holder_name}</Row>
              <Row label="Condiciones de la vivienda" wide>
                {renovaCase.conditions}
              </Row>
            </Section>

            <Section title="Finanzas">
              <Row label="Valor de mercado">{formatRenovaMoney(renovaCase.market_value, renovaCase.currency)}</Row>
              <Row label="Espera recibir el propietario">
                {formatRenovaMoney(renovaCase.owner_expected_amount, renovaCase.currency)}
              </Row>
              <Row label="Propuesta final">{formatRenovaMoney(renovaCase.final_offer, renovaCase.currency)}</Row>
              <Row label="Adeudos totales">{formatRenovaMoney(renovaCase.total_debt, renovaCase.currency)}</Row>
              <Row label="Deuda predial">{formatRenovaMoney(renovaCase.property_tax_debt, renovaCase.currency)}</Row>
              <Row label="Deuda de agua">{formatRenovaMoney(renovaCase.water_debt, renovaCase.currency)}</Row>
              <Row label="Deuda de luz">{formatRenovaMoney(renovaCase.electricity_debt, renovaCase.currency)}</Row>
              <Row label="Deuda de gas">{formatRenovaMoney(renovaCase.gas_debt, renovaCase.currency)}</Row>
              <Row label="Otros adeudos">{formatRenovaMoney(renovaCase.other_debt, renovaCase.currency)}</Row>
              <Row label="A quién se debe">{renovaCase.debt_owed_to}</Row>
            </Section>

            <Section title="Motivación y evaluación">
              <Row label="Razón por la que quiere vender" wide>
                {renovaCase.sale_reason}
              </Row>
              <Row label="Preguntas clave" wide>
                {renovaCase.key_questions}
              </Row>
              <Row label="Situación general" wide>
                {renovaCase.general_situation}
              </Row>
              <Row label="Notas adicionales" wide>
                {renovaCase.notes}
              </Row>
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
