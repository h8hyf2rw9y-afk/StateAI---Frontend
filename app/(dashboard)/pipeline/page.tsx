import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PipelineWorkspace } from "@/features/pipeline/components/pipeline-workspace";

/**
 * PipelineWorkspace reads `?view=` via useSearchParams, which Next.js wants
 * inside a Suspense boundary (see the useSearchParams docs); the fallback is
 * only ever briefly visible on first load.
 */
export default function PipelinePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading pipeline…
        </div>
      }
    >
      <PipelineWorkspace />
    </Suspense>
  );
}
