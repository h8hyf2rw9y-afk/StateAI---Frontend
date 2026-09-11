"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircleMore, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { getFollowUpRecommendation } from "@/lib/api/ai";
import { getLatestAgentExecution } from "@/lib/api/agent-executions";
import {
  getAiErrorMessage,
  getChannelLabel,
  getFollowUpActionLabel,
  getPriorityBadgeClassName,
  formatConfidence,
} from "@/features/ai/lib";
import type { FollowUpResult } from "@/features/ai/types";
import { cn } from "@/lib/utils";

type Status = "checking" | "idle" | "loading" | "success" | "error";

/**
 * Same persistence/restore contract as LeadIntelligencePanel — see that
 * file's doc comment. Still user-triggered only, still advisory only
 * (nothing here sends a message).
 */
export function FollowUpPanel({ contactId }: { contactId: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [result, setResult] = useState<FollowUpResult | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const response = await getLatestAgentExecution<FollowUpResult>(contactId, "follow_up");
      if (cancelled) return;

      if (!response.ok || response.data === null) {
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

  async function handleGenerate() {
    setStatus("loading");
    setErrorMessage(null);

    const response = await getFollowUpRecommendation(contactId);

    if (!response.ok) {
      setStatus("error");
      setErrorMessage(getAiErrorMessage(response.error));
      return;
    }

    setResult(response.data);
    setIsStale(false);
    setStatus("success");
  }

  const actionLabel = status === "success" && isStale ? "Refresh analysis" : status === "success" ? "Regenerate" : "Generate follow-up";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageCircleMore className="size-4 text-primary" aria-hidden="true" />
          Follow-up
        </CardTitle>
        <Button size="sm" onClick={handleGenerate} disabled={status === "loading" || status === "checking"}>
          {status === "loading" && <Loader2 className="size-4 animate-spin" />}
          {actionLabel}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {status === "checking" && <p className="text-sm text-muted-foreground">Checking for a previous recommendation…</p>}

        {status === "idle" && (
          <p className="text-sm text-muted-foreground">
            Ask the AI whether this lead needs follow-up right now, and through which channel.
          </p>
        )}

        {status === "loading" && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">Generating follow-up recommendation…</p>
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
                New information available for this lead since this recommendation was generated.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={result.recommendation.should_follow_up ? "default" : "secondary"}>
                {result.recommendation.should_follow_up ? "Follow-up recommended" : "No follow-up needed right now"}
              </Badge>
              {result.recommendation.should_follow_up && (
                <Badge
                  variant="outline"
                  className={cn("border-transparent capitalize", getPriorityBadgeClassName(result.recommendation.priority))}
                >
                  {result.recommendation.priority} priority
                </Badge>
              )}
              <Badge variant="secondary">{formatConfidence(result.recommendation.confidence)} confidence</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Channel</p>
                <p className="mt-0.5 text-sm font-medium">{getChannelLabel(result.recommendation.recommended_channel)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase">Action</p>
                <p className="mt-0.5 text-sm font-medium">{getFollowUpActionLabel(result.recommendation.recommended_action)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Why</p>
              <p className="mt-0.5 text-sm">{result.recommendation.reason}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Suggested message</p>
              {result.recommendation.suggested_message ? (
                <p className="mt-1 rounded-lg border bg-muted/30 p-3 text-sm italic">
                  &ldquo;{result.recommendation.suggested_message}&rdquo;
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-muted-foreground">No message was generated.</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              This is a suggestion only — nothing is sent automatically. Review and send it yourself.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
