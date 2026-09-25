"use client";

import { createContext, useContext, useState, type KeyboardEvent, type ReactNode } from "react";
import { Check, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RenovaFormValues } from "@/features/renova/lib/form-values";
import type { RenovaFormErrors } from "@/features/renova/lib/validation";
import { formatMoneyInputDisplay, normalizeMoneyInput } from "@/features/renova/lib/money";
import { cn } from "@/lib/utils";

type StringField = {
  [K in keyof RenovaFormValues]: RenovaFormValues[K] extends string ? K : never;
}[keyof RenovaFormValues];

export interface RenovaFormState {
  values: RenovaFormValues;
  errors: RenovaFormErrors;
  /** Expanded dialog → up to four small fields per row. */
  expanded: boolean;
  set: <K extends keyof RenovaFormValues>(field: K, value: RenovaFormValues[K]) => void;
}

const RenovaFormContext = createContext<RenovaFormState | null>(null);
export const RenovaFormProvider = RenovaFormContext.Provider;

function useRenovaForm(): RenovaFormState {
  const state = useContext(RenovaFormContext);
  if (!state) throw new Error("Renova form fields must be rendered inside <RenovaFormProvider>.");
  return state;
}

export const fieldId = (name: string) => `renova-${name}`;

// One responsive grid for the whole form: 1 column on phones, a 6-track grid
// on tablets (2 per row) and a 12-track grid on desktop (3 per row, or 4 small
// fields per row once the dialog is expanded). Spans are literal strings so
// Tailwind can see them.
export type FieldSize = "xs" | "sm" | "half" | "full";
const SPAN: Record<"normal" | "expanded", Record<FieldSize, string>> = {
  normal: {
    xs: "sm:col-span-2 lg:col-span-2",
    sm: "sm:col-span-3 lg:col-span-4",
    half: "sm:col-span-6 lg:col-span-6",
    full: "sm:col-span-6 lg:col-span-12",
  },
  expanded: {
    xs: "sm:col-span-2 lg:col-span-2",
    sm: "sm:col-span-3 lg:col-span-3",
    half: "sm:col-span-6 lg:col-span-6",
    full: "sm:col-span-6 lg:col-span-12",
  },
};

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-6 lg:grid-cols-12">{children}</div>;
}

/** A titled group of fields, separated from the next by spacing and a thin rule — deliberately not a card. */
export function FormSection({ id, title, icon: Icon, children }: { id: string; title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section aria-labelledby={`renova-section-${id}`} className="flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b pb-2">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        <h3 id={`renova-section-${id}`} className="text-sm font-medium">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

/** A quiet label inside a section (e.g. "Titular" / "Cónyuge") — spans the full row. */
export function SubHeading({ children }: { children: ReactNode }) {
  const { expanded } = useRenovaForm();
  return <p className={cn("text-xs font-medium tracking-wide text-muted-foreground uppercase", SPAN[expanded ? "expanded" : "normal"].full)}>{children}</p>;
}

interface FieldShellProps {
  name: string;
  label: string;
  size?: FieldSize;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Renders the label as plain text (a group label) instead of a <label for>. */
  groupLabelId?: string;
  children: ReactNode;
}

export function FieldShell({ name, label, size = "sm", required, hint, error, groupLabelId, children }: FieldShellProps) {
  const { expanded } = useRenovaForm();
  const id = fieldId(name);
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", SPAN[expanded ? "expanded" : "normal"][size])}>
      {groupLabelId ? (
        <span id={groupLabelId} className="text-sm leading-none font-medium select-none">
          {label}
        </span>
      ) : (
        <Label htmlFor={id}>
          {label}
          {required && (
            <span aria-hidden="true" className="text-destructive">
              {" "}
              *
            </span>
          )}
        </Label>
      )}
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(name: string, error: string | undefined, hint: string | undefined) {
  const id = fieldId(name);
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export function TextField({
  name,
  label,
  size,
  required,
  type = "text",
  inputMode,
  hint,
}: {
  name: StringField;
  label: string;
  size?: FieldSize;
  required?: boolean;
  type?: "text" | "date" | "number";
  inputMode?: "text" | "tel" | "numeric" | "decimal";
  hint?: string;
}) {
  const { values, errors, set } = useRenovaForm();
  const error = errors[name];
  return (
    <FieldShell name={name} label={label} size={size} required={required} hint={hint} error={error}>
      <Input
        id={fieldId(name)}
        type={type}
        inputMode={inputMode}
        value={values[name]}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? (name === "bathrooms" ? "0.5" : "1") : undefined}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, hint)}
        onChange={(event) => set(name, event.target.value)}
      />
    </FieldShell>
  );
}

export function TextAreaField({ name, label, size = "full", rows = 3 }: { name: StringField; label: string; size?: FieldSize; rows?: number }) {
  const { values, errors, set } = useRenovaForm();
  const error = errors[name];
  return (
    <FieldShell name={name} label={label} size={size} error={error}>
      <Textarea
        id={fieldId(name)}
        rows={rows}
        value={values[name]}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, error, undefined)}
        onChange={(event) => set(name, event.target.value)}
      />
    </FieldShell>
  );
}

/**
 * An MXN amount. The value held in the form is the bare number ("1400000.5");
 * while the box is not focused it is DISPLAYED with thousands separators
 * ("1,400,000.5"). A minus sign is left in place on purpose so validation can
 * refuse it visibly instead of it being silently dropped.
 */
export function MoneyField({ name, label, size }: { name: StringField; label: string; size?: FieldSize }) {
  const { values, errors, set } = useRenovaForm();
  const [focused, setFocused] = useState(false);
  const error = errors[name];
  const raw = values[name];
  return (
    <FieldShell name={name} label={label} size={size} error={error}>
      <div className="relative">
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          id={fieldId(name)}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className="pr-12 pl-6"
          placeholder="0"
          value={focused ? raw : formatMoneyInputDisplay(raw)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(name, error, undefined)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => set(name, normalizeMoneyInput(event.target.value))}
        />
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">
          MXN
        </span>
      </div>
    </FieldShell>
  );
}

const NONE = "__none__";

export function SelectField({
  name,
  label,
  size,
  required,
  options,
  placeholder = "Selecciona…",
  allowNone,
}: {
  name: StringField;
  label: string;
  size?: FieldSize;
  required?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
  /** Adds an explicit "Sin especificar" entry that stores "". */
  allowNone?: boolean;
}) {
  const { values, errors, set } = useRenovaForm();
  const error = errors[name];
  const current = values[name];
  const labelFor = (value: string | null) =>
    !value || value === NONE ? placeholder : (options.find((o) => o.value === value)?.label ?? placeholder);
  return (
    <FieldShell name={name} label={label} size={size} required={required} error={error}>
      <Select value={current || NONE} onValueChange={(next) => set(name, !next || next === NONE ? "" : next)}>
        <SelectTrigger
          id={fieldId(name)}
          className="w-full"
          aria-label={label}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(name, error, undefined)}
        >
          <SelectValue>{(value: string | null) => labelFor(value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value={NONE}>Sin especificar</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

/**
 * A small set of mutually exclusive choices as selectable buttons (radio
 * semantics: one tab stop, arrow keys move the selection). Selection is shown
 * with a check mark as well as color, never color alone.
 */
export function SegmentedField({
  name,
  label,
  size,
  options,
  allowClear,
}: {
  name: StringField;
  label: string;
  size?: FieldSize;
  options: { value: string; label: string }[];
  /** Clicking the selected option again clears it (for optional fields). */
  allowClear?: boolean;
}) {
  const { values, set } = useRenovaForm();
  const current = values[name];
  const labelId = `${fieldId(name)}-label`;
  const tabStopValue = options.some((o) => o.value === current) ? current : options[0].value;

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    set(name, next.value);
    document.getElementById(`${fieldId(name)}-${next.value}`)?.focus();
  }

  return (
    <FieldShell name={name} label={label} size={size} groupLabelId={labelId}>
      <div id={fieldId(name)} role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
        {options.map((option, index) => {
          const selected = option.value === current;
          return (
            <Button
              key={option.value}
              id={`${fieldId(name)}-${option.value}`}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={option.value === tabStopValue ? 0 : -1}
              variant="outline"
              size="sm"
              className={cn(selected && "border-primary bg-primary/15 text-foreground hover:bg-primary/20")}
              onClick={() => set(name, selected && allowClear ? "" : option.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {selected && <Check aria-hidden="true" />}
              {option.label}
            </Button>
          );
        })}
      </div>
    </FieldShell>
  );
}

type BooleanField = {
  [K in keyof RenovaFormValues]: RenovaFormValues[K] extends boolean ? K : never;
}[keyof RenovaFormValues];

/**
 * A single yes/no CONFIGURATION toggle — same visual language as
 * SegmentedField's buttons, but for one independent boolean rather than a
 * mutually-exclusive group (e.g. "Dúplex": a house or an apartment can
 * additionally have this, so it must never share a radiogroup with, or clear,
 * the base "Tipo de vivienda" selection). A real toggle button (`role`
 * defaults to none, native `<button>` semantics), so Enter/Space and Tab
 * already work with no extra key handling.
 */
export function ToggleField({ name, label, size = "xs" }: { name: BooleanField; label: string; size?: FieldSize }) {
  const { values, expanded, set } = useRenovaForm();
  const active = Boolean(values[name]);

  return (
    <div className={cn("flex min-w-0 flex-col justify-end", SPAN[expanded ? "expanded" : "normal"][size])}>
      <Button
        id={fieldId(name)}
        type="button"
        role="checkbox"
        aria-checked={active}
        variant="outline"
        size="sm"
        className={cn("w-fit", active && "border-primary bg-primary/15 text-foreground hover:bg-primary/20")}
        onClick={() => set(name, !active as RenovaFormValues[BooleanField])}
      >
        {active && <Check aria-hidden="true" />}
        {label}
      </Button>
    </div>
  );
}

/**
 * A protected identifier (NSS / número de crédito). It is data to be typed and
 * read, NOT a password: the input is plain visible text (numeric keypad, no
 * autofill or spellcheck) so every digit can be checked before saving.
 *
 * Three situations:
 *  - Nothing stored (a new case, or a case without the value): a visible input.
 *  - A value is stored: the input is NOT shown. The person sees the server's
 *    mask (or the full value while it is revealed) with "Reemplazar" and
 *    "Quitar". The mask is display text only — it can never reach the payload,
 *    because it is not in the form values at all. An untouched field sends
 *    nothing, so the stored ciphertext is kept.
 *  - Replacing: an empty visible input appears; only what is typed is sent. An
 *    empty input does NOT mean "delete" — removal is its own confirmed action.
 */
export function ProtectedIdentifierField({
  name,
  clearFlag,
  label,
  helper,
  masked,
  revealed,
  size,
}: {
  name: "nss" | "credit_number";
  clearFlag: "clear_nss" | "clear_credit_number";
  label: string;
  helper: string;
  /** The server's mask when a value is stored, null when none is. */
  masked: string | null;
  /** The full value while the person has revealed it (in memory only), otherwise null. */
  revealed: string | null;
  size?: FieldSize;
}) {
  const { values, errors, set } = useRenovaForm();
  const [replacing, setReplacing] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);
  const error = errors[name];
  const removed = values[clearFlag];
  const hasStored = masked !== null;
  const showInput = !hasStored || replacing;
  const id = fieldId(name);

  function startReplacing() {
    setReplacing(true);
    set(clearFlag, false);
  }
  function stopReplacing() {
    setReplacing(false);
    set(name, "");
  }

  if (showInput) {
    return (
      <FieldShell name={name} label={label} size={size} hint={helper} error={error}>
        <div className="flex gap-2">
          <Input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore
            data-lpignore="true"
            value={values[name]}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(name, error, helper)}
            onChange={(event) => set(name, event.target.value)}
          />
          {hasStored && (
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={stopReplacing} aria-label={`Cancelar reemplazo de ${label}`}>
              Cancelar
            </Button>
          )}
        </div>
      </FieldShell>
    );
  }

  const labelId = `${id}-label`;
  return (
    <FieldShell name={name} label={label} size={size} groupLabelId={labelId} hint={removed ? "Se eliminará al guardar." : undefined}>
      <div className="flex flex-col gap-2">
        <p
          aria-labelledby={labelId}
          data-testid={`${name}-display`}
          className={cn("min-h-8 rounded-lg border border-dashed px-2.5 py-1.5 font-mono text-sm tracking-wide break-all", removed && "text-muted-foreground line-through")}
        >
          {revealed ?? masked}
        </p>
        {confirmingRemoval ? (
          <div role="alertdialog" aria-label={`Confirmar eliminación de ${label}`} className="flex flex-col gap-2 rounded-md border p-2 text-xs">
            <p>¿Quitar el {label} guardado? Se eliminará al guardar los cambios.</p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => {
                  set(name, "");
                  set(clearFlag, true);
                  setConfirmingRemoval(false);
                }}
              >
                Sí, quitar
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setConfirmingRemoval(false)}>
                No quitar
              </Button>
            </div>
          </div>
        ) : removed ? (
          <div>
            <Button type="button" size="sm" variant="outline" onClick={() => set(clearFlag, false)} aria-label={`Deshacer eliminación de ${label}`}>
              Deshacer
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={startReplacing}>
              Reemplazar {label}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setConfirmingRemoval(true)} aria-label={`Quitar ${label}`}>
              Quitar
            </Button>
          </div>
        )}
      </div>
    </FieldShell>
  );
}
