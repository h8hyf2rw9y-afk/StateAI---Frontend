import { Handshake, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PropertiesGrid } from "@/features/properties/components/properties-grid";
import { PropertyForm } from "@/features/properties/components/property-form";

export default function PropertiesPage() {
  return (
    <>
      <PageHeader
        title="Properties"
        description="Your own inventory, plus properties other advisors have passed you."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Same form and same Property record — only pre-selects "External / Collaboration" so it lands in the External advisors tab. */}
            <PropertyForm
              defaultOwnership="external"
              trigger={
                <Button variant="outline">
                  <Handshake />
                  Add external property
                </Button>
              }
            />
            <PropertyForm
              trigger={
                <Button>
                  <Plus />
                  Add property
                </Button>
              }
            />
          </div>
        }
      />
      <PropertiesGrid />
    </>
  );
}
