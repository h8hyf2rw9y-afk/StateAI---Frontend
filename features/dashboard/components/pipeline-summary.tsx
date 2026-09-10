import Link from "next/link";
import { formatOpportunityStage } from "@/features/pipeline/types";
import type { PipelineStageSummary } from "@/features/dashboard/lib";
import { formatCurrency } from "@/lib/format";

/**
 * Real per-stage Opportunity summary (see features/dashboard/lib.ts's
 * getPipelineSummary) — replaces the old mock version, which iterated a
 * fixed 7-value mock PIPELINE_STAGES list. The real Opportunity stage
 * vocabulary has 13 values across two different opportunity_type pipelines
 * (buy/sell — see OPPORTUNITY_STAGES_BY_TYPE), so this only renders whatever
 * stages the org's own opportunities are actually in, rather than a fixed
 * row for every stage (most of which would show "0 · $0" for a small demo
 * org and add noise, not information).
 *
 * `currency` is `null` when the org's opportunities don't all share one
 * currency (see getPipelineSummary/resolveSharedCurrency) — in that case
 * this shows counts only, never a blended total mislabeled as one currency.
 */
export function PipelineSummary({ rows, currency }: { rows: PipelineStageSummary[]; currency: string | null }) {
  const maxValue = Math.max(...rows.map((s) => s.value), 1);

  return (
    <Link href="/pipeline" className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.stage} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{formatOpportunityStage(row.stage)}</span>
            <span className="text-muted-foreground">
              {row.count} {currency ? `· ${formatCurrency(row.value, currency)}` : ""}
            </span>
          </div>
          {currency && (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max((row.value / maxValue) * 100, row.value > 0 ? 4 : 0)}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </Link>
  );
}
