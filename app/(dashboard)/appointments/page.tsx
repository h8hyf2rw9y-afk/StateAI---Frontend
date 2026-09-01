import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { AppointmentsList } from "@/features/appointments/components/appointments-list";
import { mockAppointments } from "@/features/appointments/mock-data";

export default function AppointmentsPage() {
  return (
    <>
      <PageHeader
        title="Appointments"
        description="Viewings, calls, and meetings across your whole team."
        actions={
          <Button disabled>
            <Plus />
            Schedule appointment
          </Button>
        }
      />
      <AppointmentsList appointments={mockAppointments} />
    </>
  );
}
