import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * Replaces the old mock "AI recommendations" widget (a list of fabricated
 * `AiRecommendation` items with no real source). There is no passive,
 * always-on AI recommendation feed on this backend — all three real agents
 * (Lead Intelligence, Follow-up, Pipeline) are explicitly user-triggered,
 * one contact at a time (see features/ai/components/), so showing a list of
 * "recommendations" here would either mean re-running all three agents for
 * every contact on every dashboard load (slow, and not how these agents are
 * designed to be used) or fabricating results — both wrong. This card is
 * instead an honest link to where the real analysis actually happens.
 */
export function AiAssistantCta() {
  return (
    <Link
      href="/ai-assistant"
      className="flex items-center gap-3 rounded-lg border border-dashed p-4 transition-colors hover:bg-accent"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Sparkles className="size-4.5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Run an AI analysis</p>
        <p className="text-xs text-muted-foreground">
          Get a real, on-demand read on any lead&apos;s priority, follow-up needs, or pipeline risk.
        </p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
