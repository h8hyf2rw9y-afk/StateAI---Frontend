import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PropertiesGrid } from "@/features/properties/components/properties-grid";
import { PropertyForm } from "@/features/properties/components/property-form";

export default function PropertiesPage() {
  return (
    <>
      <PageHeader
        title="Properties"
        description="Every listing in your organization's CRM."
        actions={
          <PropertyForm
            trigger={
              <Button>
                <Plus />
                Add property
              </Button>
            }
          />
        }
      />
      <PropertiesGrid />
    </>
  );
}
