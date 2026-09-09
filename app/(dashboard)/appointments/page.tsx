"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { AppointmentsList } from "@/features/appointments/components/appointments-list";
import { AppointmentForm } from "@/features/appointments/components/appointment-form";

/**
 * A Client Component page, same reasoning as app/(dashboard)/tasks/page.tsx:
 * Appointments has no per-entity detail page to redirect to after
 * creation, so "Schedule appointment" bumps `refreshKey` to remount (and
 * re-fetch) the list below it instead.
 */
export default function AppointmentsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <PageHeader
        title="Appointments"
        description="Viewings, calls, and meetings across your whole team."
        actions={
          <AppointmentForm
            onSaved={() => setRefreshKey((k) => k + 1)}
            trigger={
              <Button>
                <Plus />
                Schedule appointment
              </Button>
            }
          />
        }
      />
      <AppointmentsList key={refreshKey} />
    </>
  );
}
