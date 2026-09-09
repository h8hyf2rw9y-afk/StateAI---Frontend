"use client";

import { useState } from "react";
import { BrainCircuit, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { getLeadIntelligence } from "@/lib/api/ai";
import { getAiErrorMessage, getNextActionLabel, getPriorityBadgeClassName, formatConfidence } from "@/features/ai/lib";
import type { LeadIntelligenceResult } from "@/features/ai/types";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "success" | "error";

/**
 * User-triggered only — never runs on page load (see this task's explicit
 * "do not automatically execute the AI every time the page loads"). One
 * call per click; the result is only ever kept in local component state,
 * nothing is persisted. Read-only: this panel cannot send a message, change
 * any CRM record, or take any action — it only displays what the backend's
 * Lead Intelligence Agent recommends for a human advisor to consider.
 */
export function LeadIntelligencePanel({ contactId }: { contactId: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<LeadIntelligenceResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setStatus("success");
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="size-4 text-primary" aria-hidden="true" />
          Lead Intelligence
        </CardTitle>
        <Button size="sm" onClick={handleAnalyze} disabled={status === "loading"}>
          {status === "loading" && <Loader2 className="size-4 animate-spin" />}
          {status === "success" ? "Re-analyze lead" : "Analyze lead"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
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
