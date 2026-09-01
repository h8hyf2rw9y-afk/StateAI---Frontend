import { PipelineColumn } from "@/features/pipeline/components/pipeline-column";
import { PIPELINE_STAGES, type Deal } from "@/features/pipeline/types";

/**
 * Renders one column per pipeline stage. Drag-and-drop between columns is
 * intentionally not implemented yet — moving a deal will eventually call
 * lib/api/pipeline.ts#moveDeal once the backend can persist the change.
 */
export function PipelineBoard({ deals }: { deals: Deal[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {PIPELINE_STAGES.map((stage) => (
        <PipelineColumn
          key={stage}
          stage={stage}
          deals={deals.filter((deal) => deal.stage === stage)}
        />
      ))}
    </div>
  );
}
