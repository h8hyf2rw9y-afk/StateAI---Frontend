"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { getLeadIntelligence } from "@/lib/api/ai";
import { getLatestAgentExecution } from "@/lib/api/agent-executions";
import { getAiErrorMessage, getNextActionLabel, getPriorityBadgeClassName, formatConfidence } from "@/features/ai/lib";
import type { LeadIntelligenceResult } from "@/features/ai/types";
import { cn } from "@/lib/utils";

type Status = "checking" | "idle" | "loading" | "success" | "error";

/**
 * User-TRIGGERED LLM calls only — a click on Analyze/Refresh is still the
 * only thing that ever runs the Lead Intelligence Agent (see this task's
 * explicit "do not automatically execute the AI every time the page loads,"
 * unchanged from before). What changed: the *result* of the last real run
 * is no longer thrown away when this panel unmounts (e.g. the advisor
 * switches to another client) — GET /ai/agent-executions/latest (a pure
 * read, never an LLM call) restores it, so switching back to a
 * previously-analyzed client shows that analysis immediately instead of
 * forcing a wasteful re-run of a 60-250s CPU-only Ollama call.
 *
 * Callers whose `contactId` can change during this component's lifetime
 * MUST pass `key={contactId}` (see app/(dashboard)/ai-assistant/page.tsx) —
 * that remounts the component fresh (starting again from the `checking`
 * initial state below) instead of this effect setState-ing a reset
 * synchronously on every prop change, so a previous client's result can
 * never flash while the newly-selected client's own stored result is being
 * looked up. The other two current call sites (the Lead detail page, the
 * Opportunity detail page) each render this for one fixed contact for the
 * page's whole lifetime, so no such remount is needed there.
 */
export function LeadIntelligencePanel({ contactId }: { contactId: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [result, setResult] = useState<LeadIntelligenceResult | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const response = await getLatestAgentExecution<LeadIntelligenceResult>(contactId, "lead_intelligence");
      if (cancelled) return;

      if (!response.ok) {
        // A failed lookup shouldn't block the advisor from just running a
        // fresh analysis — this quietly falls back to the empty state
        // rather than surfacing a second error path alongside Analyze's own.
        setStatus("idle");
        return;
      }

      if (response.data === null) {
        setStatus("idle");
        return;
      }

      setResult(response.data.output);
      setIsStale(response.data.is_stale);
      setStatus("success");
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  async function handleAnalyze() {
    setStatus("loading");
    setErrorMessage(null);

    const response = await getLeadIntelligence(contactId);

    if (!response.ok) {
      setStatus("error");
      setErrorMessage(getAiErrorMessage(response.error));
      return;
    }

    setResult(response.data);
    setIsStale(false);
    setStatus("success");
  }

  const actionLabel = status === "success" && isStale ? "Refresh analysis" : status === "success" ? "Re-analyze lead" : "Analyze lead";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="size-4 text-primary" aria-hidden="true" />
          Lead Intelligence
        </CardTitle>
        <Button size="sm" onClick={handleAnalyze} disabled={status === "loading" || status === "checking"}>
          {status === "loading" && <Loader2 className="size-4 animate-spin" />}
          {actionLabel}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {status === "checking" && <p className="text-sm text-muted-foreground">Checking for a previous analysis…</p>}

        {status === "idle" && (
          <p className="text-sm text-muted-foreground">
            Get an AI read on how important this lead is right now and what to do next.
          </p>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">Analyzing lead…</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              This may take up to a couple of minutes while the local AI model processes the lead.
            </p>
          </div>
        )}

        {status === "error" && <FormError message={errorMessage} />}

        {status === "success" && result && (
          <div className="flex flex-col gap-3">
            {isStale && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                <RefreshCw className="size-3.5 shrink-0" aria-hidden="true" />
                New information available for this lead since this analysis was generated.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("border-transparent capitalize", getPriorityBadgeClassName(result.analysis.priority))}
              >
                {result.analysis.priority} priority
              </Badge>
              <Badge variant="secondary">{formatConfidence(result.analysis.confidence)} confidence</Badge>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Recommended action</p>
              <p className="mt-0.5 text-sm font-medium">{getNextActionLabel(result.analysis.recommended_next_action)}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Why</p>
              <p className="mt-0.5 text-sm">{result.analysis.reasoning}</p>
            </div>

            {result.analysis.positive_signals.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Positive signals</p>
                <ul className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
                  {result.analysis.positive_signals.map((signal, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" />
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.analysis.risk_signals.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Risk signals</p>
                <ul className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
                  {result.analysis.risk_signals.map((signal, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" />
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
