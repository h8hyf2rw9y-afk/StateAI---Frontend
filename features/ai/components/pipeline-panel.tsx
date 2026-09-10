"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ListChecks, Loader2, Waypoints } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { getPipelineAnalysis } from "@/lib/api/ai";
import { getOpportunities } from "@/lib/api/pipeline";
import { getAiErrorMessage, getPipelineActionLabel, getPriorityBadgeClassName, formatConfidence } from "@/features/ai/lib";
import { getTaskPriorityBadgeClassName, formatTaskPriority } from "@/features/tasks/types";
import type { PipelineResult } from "@/features/ai/types";
import type { Opportunity } from "@/features/pipeline/types";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "success" | "error";

/**
 * Mirrors LeadIntelligencePanel/FollowUpPanel exactly (same Status union,
 * same idle/loading/error/success shape, same one-call-per-click contract,
 * same "never runs on page load" rule) — the third and last of the app's
 * three real AI agent panels. Added in the CRM Integration Gaps task; the
 * backend endpoint (POST /ai/pipeline/{contact_id}) already existed and had
 * already been tested against real Ollama, this is its first frontend
 * consumer.
 *
 * Also fetches the contact's own Opportunities (GET /opportunities?contact_id=)
 * alongside the analysis — not because the agent needs it (the backend
 * already builds its own LeadContext), but so this panel can resolve each
 * `opportunity_id` the model returns to a real title and a link to
 * /pipeline/{id}, the same "parent resolves names by id, never duplicated
 * onto the row" convention OpportunityCard already established. If that
 * lookup fails or an id isn't found, the item still renders — just with a
 * generic fallback label, never a raw UUID as the headline.
 *
 * Read-only, same as the other two panels: this cannot change any
 * Opportunity/Task/Appointment/Contact/Property/Buyer Requirement/Activity —
 * it only displays what the backend's Pipeline Agent recommends.
 */
export function PipelinePanel({ contactId }: { contactId: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleAnalyze() {
    setStatus("loading");
    setErrorMessage(null);

    const [analysisResponse, opportunitiesResponse] = await Promise.all([
      getPipelineAnalysis(contactId),
      getOpportunities({ contact_id: contactId }),
    ]);

    if (!analysisResponse.ok) {
      setStatus("error");
      setErrorMessage(getAiErrorMessage(analysisResponse.error));
      return;
    }

    setResult(analysisResponse.data);
    // A failure here only means opportunity titles fall back to a generic
    // label below — not worth failing the whole panel over, since the
    // analysis itself (the thing the user asked for) already succeeded.
    setOpportunities(opportunitiesResponse.ok ? opportunitiesResponse.data : []);
    setStatus("success");
  }

  function opportunityTitle(opportunityId: string): string {
    return opportunities.find((o) => o.id === opportunityId)?.title ?? "Opportunity";
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Waypoints className="size-4 text-primary" aria-hidden="true" />
          Pipeline
        </CardTitle>
        <Button size="sm" onClick={handleAnalyze} disabled={status === "loading"}>
          {status === "loading" && <Loader2 className="size-4 animate-spin" />}
          {status === "success" ? "Re-analyze pipeline" : "Analyze pipeline"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {status === "idle" && (
          <p className="text-sm text-muted-foreground">
            Get an AI read on this contact&apos;s whole pipeline of opportunities — priority, risks, and what to do next.
          </p>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">Analyzing pipeline…</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              This may take up to a couple of minutes while the local AI model processes the pipeline.
            </p>
          </div>
        )}

        {status === "error" && <FormError message={errorMessage} />}

        {status === "success" && result && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("border-transparent capitalize", getPriorityBadgeClassName(result.analysis.overall_priority))}
              >
                {result.analysis.overall_priority} priority
              </Badge>
              <Badge variant="secondary">{formatConfidence(result.analysis.confidence)} confidence</Badge>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Summary</p>
              <p className="mt-0.5 text-sm">{result.analysis.summary}</p>
            </div>

            {result.analysis.opportunities.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Opportunities</p>
                <ul className="mt-1.5 flex flex-col gap-2">
                  {result.analysis.opportunities.map((item) => (
                    <li key={item.opportunity_id} className="rounded-lg border p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          href={`/pipeline/${item.opportunity_id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {opportunityTitle(item.opportunity_id)}
                        </Link>
                        <Badge
                          variant="outline"
                          className={cn("border-transparent capitalize", getPriorityBadgeClassName(item.priority))}
                        >
                          {item.priority}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm">{item.status_assessment}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.reason}</p>
                      <p className="mt-1.5 text-xs font-medium">
                        Next: {getPipelineActionLabel(item.recommended_action)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.analysis.immediate_actions.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase">
                  <ListChecks className="size-3.5" aria-hidden="true" />
                  Immediate actions
                </p>
                <ul className="mt-1.5 flex flex-col gap-2">
                  {result.analysis.immediate_actions.map((action, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 text-sm">
                      <div>
                        <Link href={`/pipeline/${action.opportunity_id}`} className="font-medium hover:underline">
                          {opportunityTitle(action.opportunity_id)}
                        </Link>
                        <span> — {getPipelineActionLabel(action.action)}</span>
                        <p className="text-xs text-muted-foreground">{action.reason}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("shrink-0 border-transparent capitalize", getTaskPriorityBadgeClassName(action.urgency))}
                      >
                        {formatTaskPriority(action.urgency)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.analysis.risk_flags.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase">
                  <AlertTriangle className="size-3.5" aria-hidden="true" />
                  Risk flags
                </p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {result.analysis.risk_flags.map((flag, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Badge
                        variant="outline"
                        className={cn("mt-0.5 shrink-0 border-transparent capitalize", getPriorityBadgeClassName(flag.severity))}
                      >
                        {flag.severity}
                      </Badge>
                      <span>
                        <Link href={`/pipeline/${flag.opportunity_id}`} className="font-medium hover:underline">
                          {opportunityTitle(flag.opportunity_id)}
                        </Link>
                        {": "}
                        {flag.risk}
                        <span className="block text-xs text-muted-foreground">{flag.reason}</span>
                      </span>
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
