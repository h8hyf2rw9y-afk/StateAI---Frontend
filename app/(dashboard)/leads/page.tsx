import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { LeadsTable } from "@/features/leads/components/leads-table";

export default function LeadsPage() {
  return (
    <>
      <PageHeader
        title="Leads"
        description="Every contact in your organization's CRM."
        actions={
          <Button disabled>
            <Plus />
            Add lead
          </Button>
        }
      />
      <LeadsTable />
    </>
  );
}
