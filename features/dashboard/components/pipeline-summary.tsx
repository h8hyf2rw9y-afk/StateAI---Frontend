import Link from "next/link";
import { PIPELINE_STAGE_LABELS } from "@/features/pipeline/types";
import type { PipelineStageSummary } from "@/features/dashboard/lib";
import { formatCurrency } from "@/lib/format";

export function PipelineSummary({ summary }: { summary: PipelineStageSummary[] }) {
  const maxValue = Math.max(...summary.map((s) => s.value), 1);

  return (
    <Link href="/pipeline" className="flex flex-col gap-3">
      {summary.map((row) => (
        <div key={row.stage} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{PIPELINE_STAGE_LABELS[row.stage]}</span>
            <span className="text-muted-foreground">
              {row.count} · {formatCurrency(row.value)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max((row.value / maxValue) * 100, row.value > 0 ? 4 : 0)}%` }}
            />
          </div>
        </div>
      ))}
    </Link>
  );
}
