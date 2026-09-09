import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PipelineBoard } from "@/features/pipeline/components/pipeline-board";
import { OpportunityForm } from "@/features/pipeline/components/opportunity-form";

export default function PipelinePage() {
  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Every open opportunity, organized by sales stage."
        actions={
          <OpportunityForm
            trigger={
              <Button>
                <Plus />
                New opportunity
              </Button>
            }
          />
        }
      />
      <PipelineBoard />
    </>
  );
}
