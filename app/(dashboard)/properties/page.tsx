import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PropertiesGrid } from "@/features/properties/components/properties-grid";
import { mockProperties } from "@/features/properties/mock-data";

export default function PropertiesPage() {
  return (
    <>
      <PageHeader
        title="Properties"
        description="Every listing your team is currently managing."
        actions={
          <Button disabled>
            <Plus />
            Add property
          </Button>
        }
      />
      <PropertiesGrid properties={mockProperties} />
    </>
  );
}
