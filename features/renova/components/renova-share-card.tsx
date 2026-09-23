import type { ReactNode, Ref } from "react";
import { SHARE_CARD_WIDTH } from "@/features/renova/lib/export-image";
import { formatMoney, sumDebts } from "@/features/renova/lib/money";
import { renovaShortId } from "@/features/renova/lib/short-id";
import {
  formatRenovaDate,
  formatRenovaDateTime,
  formatRenovaDeeds,
  formatRenovaDwelling,
  formatRenovaOccupancy,
  type RenovaShareCase,
} from "@/features/renova/types";

export interface RenovaShareOptions {
  includePhone: boolean;
  includeAmounts: boolean;
  includeSpouse: boolean;
  includeIdentifiers: boolean;
  includeIne: boolean;
}

export const DEFAULT_SHARE_OPTIONS: RenovaShareOptions = { includePhone: true, includeAmounts: true, includeSpouse: false, includeIdentifiers: false, includeIne: false };

const PENDING = "Pendiente";

function present(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function Item({ label, value, large, className }: { label: string; value: ReactNode | null; large?: boolean; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[13px] font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className={`mt-1 break-words whitespace-pre-wrap ${large ? "text-3xl font-semibold" : "text-lg"} ${value === null ? "text-slate-400" : "text-slate-900"}`}>
        {value ?? PENDING}
      </dd>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-slate-200 pt-6">
      <h3 className="mb-4 text-[13px] font-semibold tracking-[0.14em] text-slate-500 uppercase">{title}</h3>
      {children}
    </section>
  );
}

/**
 * The white, shareable "ficha" of a Renova case — a pure presentational
 * component: it receives a REAL case (already loaded from the backend) and the
 * person's share options through props, and fetches nothing itself.
 *
 * Fixed 1080px base width (see SHARE_CARD_WIDTH) so it is composed the same
 * way whatever the browser width; a preview may scale it with CSS, but the PNG
 * is always rendered from this unscaled node. Colors are explicit (white
 * paper, dark text), never theme tokens, so it stays legible inside the dark
 * app. There are no controls in here — everything inside is part of the image.
 *
 * The case's full UUID (only the short "RN-…" reference), storage
 * paths, signed URLs, audit data, tokens, anything technical. The phone,
 * amounts/debts and spouse appear only when their option is on. A missing
 * value reads "Pendiente" — never "undefined", "null" or "NaN".
 */
export function RenovaShareCard({
  renovaCase,
  options,
  advisorName,
  identifiers,
  ineImages,
  ref,
}: {
  renovaCase: RenovaShareCase;
  options: RenovaShareOptions;
  advisorName?: string | null;
  identifiers?: { nss: string | null; credit_number: string | null } | null;
  ineImages?: { front: string | null; back: string | null } | null;
  ref?: Ref<HTMLDivElement>;
}) {
  const c = renovaCase;
  const money = (value: string | number | null) => (value === null ? null : formatMoney(value, c.currency));
  const servicesDebt = sumDebts({ water_debt: c.water_debt ?? "", electricity_debt: c.electricity_debt ?? "", gas_debt: c.gas_debt ?? "" });
  const otherDebt = c.other_debt !== null && Number(c.other_debt) > 0 ? formatMoney(c.other_debt, c.currency) : null;
  const dwelling = c.dwelling_type ? formatRenovaDwelling(c.dwelling_type) : null;

  return (
    <div
      ref={ref}
      data-testid="renova-share-card"
      className="bg-white p-14 text-slate-900"
      style={{ width: SHARE_CARD_WIDTH, colorScheme: "light", backgroundColor: "#ffffff" }}
    >
      <header className="flex items-start justify-between gap-8 pb-8">
        <div>
          <p className="text-4xl font-bold tracking-tight text-slate-900">COMPRA DE CASAS</p>
          <p className="mt-2 text-base text-slate-500">Ficha de evaluación de propiedad</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tracking-[0.18em] text-slate-700">RENOVA · PROPPILOT</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{renovaShortId(c.id)}</p>
        </div>
      </header>

      <div className="flex flex-col gap-8">
        <dl className="grid grid-cols-2 gap-x-10 gap-y-6 border-t border-slate-200 pt-6">
          <Item label="Asesor" value={present(advisorName)} />
          <Item label="Fecha" value={formatRenovaDate(c.entry_date)} />
          {options.includeAmounts && (
            <>
              <Item label="Propuesta final" value={money(c.final_offer)} large />
              <Item label="Valor de mercado" value={money(c.market_value)} large />
            </>
          )}
        </dl>

        {options.includeAmounts && (
          <div>
            <dl className="grid grid-cols-3 gap-x-10">
              <Item label="Deuda predial" value={money(c.property_tax_debt)} />
              <Item label="Deudas de servicios" value={servicesDebt === null ? null : formatMoney(servicesDebt, c.currency)} />
              <Item label="Total de adeudos" value={money(c.total_debt)} />
            </dl>
            {otherDebt && <p className="mt-2 text-sm text-slate-500">El total incluye otros adeudos por {otherDebt}.</p>}
          </div>
        )}

        <Block title="Ubicación">
          <dl className="grid grid-cols-4 gap-x-10 gap-y-5">
            <Item label="Calle y número" value={present(c.street_address)} className="col-span-2" />
            <Item label="Colonia" value={present(c.neighborhood)} className="col-span-2" />
            <Item label="Municipio" value={present(c.municipality)} className="col-span-2" />
            <Item label="Código postal" value={present(c.postal_code)} className="col-span-2" />
          </dl>
        </Block>

        <Block title="Resumen del inmueble">
          <dl className="grid grid-cols-5 gap-x-6">
            <Item label="Tipo" value={dwelling} />
            <Item label="Plantas" value={present(c.floors)} />
            <Item label="Baños" value={present(c.bathrooms)?.replace(/\.0$/, "") ?? null} />
            <Item label="Recámaras" value={present(c.bedrooms)} />
            <Item label="Escrituras" value={c.has_deeds === "unknown" ? null : formatRenovaDeeds(c.has_deeds)} />
          </dl>
        </Block>

        <Block title="Evaluación">
          <dl className="grid grid-cols-2 gap-x-10 gap-y-5">
            <Item label="Condiciones de la casa" value={present(c.conditions)} className="col-span-2" />
            <Item label="Situación actual" value={c.occupancy_status ? formatRenovaOccupancy(c.occupancy_status) : null} />
            {options.includeAmounts && <Item label="A quién se debe" value={present(c.debt_owed_to)} />}
            <Item label="Comentarios relevantes" value={present(c.general_situation)} className="col-span-2" />
          </dl>
        </Block>

        <Block title="Datos de contacto">
          <dl className="grid grid-cols-2 gap-x-10 gap-y-5">
            <Item label="Nombre del titular" value={present(c.owner_name)} />
            {options.includePhone && <Item label="Celular" value={present(c.owner_phone)} />}
            {options.includeSpouse && (
              <>
                <Item label="Nombre del cónyuge" value={present(c.spouse_name)} />
                {options.includePhone && <Item label="Celular del cónyuge" value={present(c.spouse_phone)} />}
              </>
            )}
          </dl>
        </Block>

        {options.includeIdentifiers && identifiers && (
          <Block title="Datos del crédito">
            <dl className="grid grid-cols-2 gap-x-10 gap-y-5">
              <Item label="NSS" value={present(identifiers.nss)} />
              <Item label="Número de crédito" value={present(identifiers.credit_number)} />
            </dl>
          </Block>
        )}

        {options.includeIne && ineImages && (ineImages.front || ineImages.back) && (
          <Block title="Identificación oficial (INE)">
            <div className="grid grid-cols-2 gap-6">
              {(["front", "back"] as const).map((side) => ineImages[side] && (
                <div key={side}>
                  <p className="mb-2 text-sm text-slate-500">{side === "front" ? "Frente" : "Reverso"}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ineImages[side]!} alt={`INE ${side === "front" ? "frente" : "reverso"}`} className="w-full rounded border border-slate-200 object-contain" />
                </div>
              ))}
            </div>
          </Block>
        )}

        <Block title="Preguntas clave">
          <dl className="grid grid-cols-1 gap-y-5">
            <Item label="¿Por qué la quiere vender?" value={present(c.sale_reason)} />
            {options.includeAmounts && <Item label="¿Cuánto espera recibir?" value={money(c.owner_expected_amount)} />}
          </dl>
        </Block>
      </div>

      <footer className="mt-10 flex items-center justify-between border-t border-slate-200 pt-5 text-sm text-slate-500">
        <span>Última actualización: {formatRenovaDateTime(c.updated_at)}</span>
        <span>Información de evaluación interna</span>
      </footer>
    </div>
  );
}
