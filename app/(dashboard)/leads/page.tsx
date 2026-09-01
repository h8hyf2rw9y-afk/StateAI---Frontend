import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { LeadsTable } from "@/features/leads/components/leads-table";
import { mockLeads } from "@/features/leads/mock-data";

export default function LeadsPage() {
  return (
    <>
      <PageHeader
        title="Leads"
        description="Every lead in your pipeline, prioritized by AI score."
        actions={
          <Button disabled>
            <Plus />
            Add lead
          </Button>
        }
      />
      <LeadsTable leads={mockLeads} />
    </>
  );
}
