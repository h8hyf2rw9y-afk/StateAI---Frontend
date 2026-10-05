"use client";

import { useState, type FormEvent, type MouseEvent } from "react";
import { CalendarClock, Loader2, Pencil, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/features/auth/components/form-error";
import { getRenovaErrorMessage } from "@/features/renova/lib/errors";
import {
  createRenovaFollowUpActivity,
  getRenovaFollowUp,
  updateRenovaFollowUpActivity,
} from "@/lib/api/renova";
import { cn } from "@/lib/utils";
import type {
  RenovaCallResult,
  RenovaCaseListItem,
  RenovaFollowUpActivity,
  RenovaFollowUpDetail,
  RenovaFollowUpSummary,
} from "@/features/renova/types";

type Mode = "summary" | "register" | "schedule" | "edit";

const RESULT_LABELS: Record<RenovaCallResult, string> = {
  no_answer: "No contestó",
  interested: "Quiere continuar",
  callback_requested: "Pidió que le llamemos",
  not_interested: "No quiere continuar",
  other: "Otro resultado",
};

const EMPTY_SUMMARY: RenovaFollowUpSummary = {
  last_call_activity_id: null,
  last_call_at: null,
  last_result: null,
  contact_attempt_count: 0,
  next_follow_up_at: null,
  is_follow_up_overdue: false,
  contact_state: "never_contacted",
  note_preview: null,
};

function toLocalInput(value: string | null): string {
  const date = value ? new Date(value) : new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIso(value: string): string {
  return new Date(value).toISOString();
}

function formatDateTime(value: string | null): string {
  if (!value) return "Sin registrar";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function triggerCopy(summary: RenovaFollowUpSummary): { title: string; detail: string; className: string } {
  if (summary.is_follow_up_overdue) {
    return { title: "Seguimiento vencido", detail: formatDateTime(summary.next_follow_up_at), className: "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300" };
  }
  if (summary.contact_state === "never_contacted") {
    return { title: "Nunca contactado", detail: "Registrar llamada", className: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-300" };
  }
  const title = summary.last_result ? RESULT_LABELS[summary.last_result] : "Contactado";
  const attempts = `${summary.contact_attempt_count} ${summary.contact_attempt_count === 1 ? "intento" : "intentos"}`;
  return {
    title,
    detail: summary.next_follow_up_at ? `Próximo: ${formatDateTime(summary.next_follow_up_at)}` : attempts,
    className:
      summary.last_result === "not_interested"
        ? "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/10 dark:text-slate-300"
        : summary.last_result === "interested"
          ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
  };
}

function latestCall(detail: RenovaFollowUpDetail | null): RenovaFollowUpActivity | null {
  if (!detail?.summary.last_call_activity_id) return null;
  return detail.activities.find((item) => item.id === detail.summary.last_call_activity_id) ?? null;
}

export function RenovaFollowUpPopover({
  renovaCase,
  onSaved,
}: {
  renovaCase: RenovaCaseListItem;
  onSaved: (summary: RenovaFollowUpSummary) => void;
}) {
  const [detail, setDetail] = useState<RenovaFollowUpDetail | null>(null);
  const [mode, setMode] = useState<Mode>("summary");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RenovaCallResult>("no_answer");
  const [occurredAt, setOccurredAt] = useState(toLocalInput(null));
  const [nextAt, setNextAt] = useState("");
  const initialSummary = renovaCase.follow_up ?? EMPTY_SUMMARY;
  const [attempt, setAttempt] = useState(String(initialSummary.contact_attempt_count + 1));
  const [notes, setNotes] = useState("");

  const summary = detail?.summary ?? initialSummary;
  const copy = triggerCopy(summary);

  async function loadDetail() {
    if (detail || loading) return;
    setLoading(true);
    setError(null);
    const response = await getRenovaFollowUp(renovaCase.id);
    setLoading(false);
    if (!response.ok) {
      setError(getRenovaErrorMessage(response.error));
      return;
    }
    setDetail(response.data);
  }

  function stopRow(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  function startRegister() {
    setMode("register");
    setResult("no_answer");
    setOccurredAt(toLocalInput(null));
    setNextAt("");
    setAttempt(String(summary.contact_attempt_count + 1));
    setNotes("");
    setError(null);
  }

  function startSchedule() {
    setMode("schedule");
    setOccurredAt(toLocalInput(null));
    setNextAt(toLocalInput(summary.next_follow_up_at));
    setNotes("");
    setError(null);
  }

  function startEdit() {
    const call = latestCall(detail);
    if (!call) return;
    setMode("edit");
    setResult(call.result ?? "other");
    setOccurredAt(toLocalInput(call.occurred_at));
    setNextAt(call.next_follow_up_at ? toLocalInput(call.next_follow_up_at) : "");
    setAttempt(String((call.attempt_number ?? summary.contact_attempt_count) || 1));
    setNotes(call.notes ?? "");
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response =
      mode === "edit" && latestCall(detail)
        ? await updateRenovaFollowUpActivity(renovaCase.id, latestCall(detail)!.id, {
            result,
            occurred_at: toIso(occurredAt),
            next_follow_up_at: nextAt ? toIso(nextAt) : null,
            attempt_number: Number(attempt),
            notes: notes.trim() || null,
          })
        : await createRenovaFollowUpActivity(
            renovaCase.id,
            mode === "schedule"
              ? {
                  activity_type: "follow_up",
                  occurred_at: toIso(occurredAt),
                  next_follow_up_at: toIso(nextAt),
                  notes: notes.trim() || null,
                }
              : {
                  activity_type: "call",
                  result,
                  occurred_at: toIso(occurredAt),
                  next_follow_up_at: nextAt ? toIso(nextAt) : null,
                  attempt_number: Number(attempt),
                  notes: notes.trim() || null,
                }
          );
    setSaving(false);
    if (!response.ok) {
      setError(getRenovaErrorMessage(response.error));
      return;
    }
    setDetail(response.data);
    onSaved(response.data.summary);
    setMode("summary");
  }

  return (
    <div onClick={stopRow} onKeyDown={(event) => event.stopPropagation()}>
      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              aria-label={`Seguimiento de ${renovaCase.owner_name}: ${copy.title}`}
              className={cn("flex min-w-36 flex-col rounded-lg border px-2.5 py-1.5 text-left transition hover:brightness-95", copy.className)}
              onClick={loadDetail}
            >
              <span className="text-xs font-semibold">{copy.title}</span>
              <span className="max-w-48 truncate text-[10px] opacity-80">{copy.detail}</span>
            </button>
          }
        />
        <PopoverContent className="w-88 p-0" align="center">
          <div className="border-b px-4 py-3">
            <p className="font-semibold">Seguimiento de {renovaCase.owner_name}</p>
            <p className="text-xs text-muted-foreground">Solo para uso interno; no aparece en la ficha compartida.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Cargando…
            </div>
          ) : mode === "summary" ? (
            <div className="space-y-3 p-4">
              {error && <FormError message={error} />}
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/45 p-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Última llamada</p>
                  <p className="font-medium">{formatDateTime(summary.last_call_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Intentos</p>
                  <p className="font-medium">{summary.contact_attempt_count}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Resultado</p>
                  <p className="font-medium">{summary.last_result ? RESULT_LABELS[summary.last_result] : "Sin registrar"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Próxima llamada</p>
                  <p className={cn("font-medium", summary.is_follow_up_overdue && "text-destructive")}>{formatDateTime(summary.next_follow_up_at)}</p>
                </div>
              </div>
              {summary.note_preview && <p className="rounded-lg border px-3 py-2 text-xs text-muted-foreground">{summary.note_preview}</p>}
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" size="sm" onClick={startRegister}><PhoneCall /> Registrar llamada</Button>
                <Button type="button" size="sm" variant="outline" onClick={startSchedule}><CalendarClock /> Agendar</Button>
              </div>
              {summary.last_call_activity_id && detail && (
                <Button type="button" size="sm" variant="ghost" className="w-full" onClick={startEdit}>
                  <Pencil /> Editar última llamada
                </Button>
              )}
            </div>
          ) : (
            <form className="space-y-3 p-4" onSubmit={submit}>
              <p className="text-sm font-semibold">
                {mode === "schedule" ? "Agendar próxima llamada" : mode === "edit" ? "Editar última llamada" : "Registrar llamada"}
              </p>
              {error && <FormError message={error} />}
              {mode !== "schedule" && (
                <div className="space-y-1.5">
                  <Label htmlFor={`follow-up-result-${renovaCase.id}`}>Resultado</Label>
                  <select
                    id={`follow-up-result-${renovaCase.id}`}
                    className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                    value={result}
                    onChange={(event) => setResult(event.target.value as RenovaCallResult)}
                  >
                    {Object.entries(RESULT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor={`follow-up-occurred-${renovaCase.id}`}>{mode === "schedule" ? "Fecha de registro" : "Fecha de llamada"}</Label>
                <Input id={`follow-up-occurred-${renovaCase.id}`} type="datetime-local" required value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} />
              </div>
              {mode !== "schedule" && (
                <div className="space-y-1.5">
                  <Label htmlFor={`follow-up-attempt-${renovaCase.id}`}>Número de intento</Label>
                  <Input id={`follow-up-attempt-${renovaCase.id}`} type="number" min={1} max={999} required value={attempt} onChange={(event) => setAttempt(event.target.value)} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor={`follow-up-next-${renovaCase.id}`}>{mode === "schedule" ? "Fecha de la próxima llamada" : "Próxima llamada (opcional)"}</Label>
                <Input id={`follow-up-next-${renovaCase.id}`} type="datetime-local" required={mode === "schedule"} value={nextAt} onChange={(event) => setNextAt(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`follow-up-notes-${renovaCase.id}`}>Notas</Label>
                <Textarea id={`follow-up-notes-${renovaCase.id}`} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Qué respondió o qué debemos recordar…" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => setMode("summary")}>Volver</Button>
                <Button type="submit" size="sm" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
              </div>
            </form>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
