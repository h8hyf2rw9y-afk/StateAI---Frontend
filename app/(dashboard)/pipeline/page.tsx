import { PageHeader } from "@/components/shared/page-header";
import { PipelineBoard } from "@/features/pipeline/components/pipeline-board";

export default function PipelinePage() {
  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Every open opportunity, organized by sales stage."
      />
      <PipelineBoard />
    </>
  );
}
