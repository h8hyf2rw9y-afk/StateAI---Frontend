"use client";

import { useState } from "react";
import { Loader2, MessageCircleMore } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { getFollowUpRecommendation } from "@/lib/api/ai";
import {
  getAiErrorMessage,
  getChannelLabel,
  getFollowUpActionLabel,
  getPriorityBadgeClassName,
  formatConfidence,
} from "@/features/ai/lib";
import type { FollowUpResult } from "@/features/ai/types";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "success" | "error";

/**
 * User-triggered only, same as LeadIntelligencePanel — never runs
 * automatically. Advisory only: this panel can show a suggested message,
 * it cannot send one. Sending it (WhatsApp/email integration) is a future
 * capability, not implemented here or in the backend.
 */
export function FollowUpPanel({ contactId }: { contactId: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<FollowUpResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setStatus("success");
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageCircleMore className="size-4 text-primary" aria-hidden="true" />
          Follow-up
        </CardTitle>
        <Button size="sm" onClick={handleGenerate} disabled={status === "loading"}>
          {status === "loading" && <Loader2 className="size-4 animate-spin" />}
          {status === "success" ? "Regenerate" : "Generate follow-up"}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
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
