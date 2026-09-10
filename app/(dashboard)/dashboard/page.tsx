"use client";

import { useEffect, useState } from "react";
import { Building2, Handshake, ListChecks, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { FormError } from "@/features/auth/components/form-error";
import { OverdueTasksList } from "@/features/dashboard/components/overdue-tasks-list";
import { UpcomingAppointmentsList } from "@/features/dashboard/components/upcoming-appointments-list";
import { PipelineSummary } from "@/features/dashboard/components/pipeline-summary";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import { AiAssistantCta } from "@/features/dashboard/components/ai-assistant-cta";
import {
  getOpenOpportunityCount,
  getOpenPipelineValue,
  getOverdueTasks,
  getPipelineSummary,
  getUpcomingAppointments,
} from "@/features/dashboard/lib";
import { getContacts } from "@/lib/api/contacts";
import { getProperties } from "@/lib/api/properties";
import { getOpportunities } from "@/lib/api/pipeline";
import { getTasks } from "@/lib/api/tasks";
import { getAppointments } from "@/lib/api/appointments";
import { getRecentActivities } from "@/lib/api/activities";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useUser } from "@/hooks/useUser";
import { getDisplayName } from "@/features/auth/lib";
import { formatCurrency } from "@/lib/format";
import type { Contact } from "@/features/leads/types";
import type { Property } from "@/features/properties/types";
import type { Opportunity } from "@/features/pipeline/types";
import type { Task } from "@/features/tasks/types";
import type { AppointmentRecord } from "@/features/appointments/types";
import type { Activity } from "@/features/pipeline/types";

type Status = "loading" | "success" | "error";

/**
 * Real Dashboard — CRM Integration Gaps task. Replaces the previous
 * entirely-mock version (mockLeads/mockProperties/mockDeals/
 * mockAppointments/mockActivity/mockRecommendations). A Client Component
 * (unlike the old Server Component version) because apiRequest — the one
 * seam every real page in this app talks to the backend through — only
 * works from the browser (see lib/api/client.ts's own doc comment: it reads
 * the Supabase session via the browser client, matching every other real
 * data page here, e.g. app/(dashboard)/tasks/page.tsx).
 *
 * Five real, already-existing list endpoints (contacts, properties,
 * opportunities, tasks, appointments) plus the one new one added for this
 * task (GET /activities — see lib/api/activities.ts) are fetched in
 * parallel; every metric below is computed from their real responses (see
 * features/dashboard/lib.ts). No backend aggregation endpoint was added for
 * this — five small, already-capped (200) list fetches for a page that
 * loads once per visit is simpler and more maintainable than a bespoke
 * "dashboard stats" endpoint would be, and every one of these lists is
 * already fetched by some other real page in this app today.
 *
 * "Active Leads" (the old mock card) is renamed to "Total Leads" here on
 * purpose: the real Contact model has no status/score field at all (a
 * lead's standing is expressed through its Opportunities instead, not a
 * flag on the contact) — see this task's own "do not invent metrics"
 * instruction. "Hot Leads" has no honest equivalent for the same reason and
 * is replaced with "Open Opportunities" (a real, direct count).
 */
export default function DashboardPage() {
  const { user } = useUser();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [contactsRes, propertiesRes, opportunitiesRes, tasksRes, appointmentsRes, activityRes] = await Promise.all([
        getContacts(),
        getProperties(),
        getOpportunities(),
        getTasks(),
        getAppointments(),
        getRecentActivities(8),
      ]);
      if (cancelled) return;

      const firstError = [contactsRes, propertiesRes, opportunitiesRes, tasksRes, appointmentsRes, activityRes].find(
        (r) => !r.ok
      );
      if (firstError && !firstError.ok) {
        setErrorMessage(getApiErrorMessage(firstError.error));
        setStatus("error");
        return;
      }

      if (contactsRes.ok) setContacts(contactsRes.data);
      if (propertiesRes.ok) setProperties(propertiesRes.data);
      if (opportunitiesRes.ok) setOpportunities(opportunitiesRes.data);
      if (tasksRes.ok) setTasks(tasksRes.data);
      if (appointmentsRes.ok) setAppointments(appointmentsRes.data);
      if (activityRes.ok) setActivity(activityRes.data);
      setStatus("success");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = getDisplayName(user).split(" ")[0] || "there";
  const contactNameById = new Map(contacts.map((c) => [c.id, `${c.first_name} ${c.last_name}`]));
  const availableProperties = properties.filter((p) => p.status === "active").length;
  const openPipelineValue = getOpenPipelineValue(opportunities);
  const pipelineSummary = getPipelineSummary(opportunities);
  const overdueTasks = getOverdueTasks(tasks);
  const upcomingAppointments = getUpcomingAppointments(appointments);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's what needs your attention today."
      />

      {status === "error" && (
        <div className="rounded-xl border p-6">
          <FormError message={errorMessage} />
        </div>
      )}

      {status !== "error" && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total leads" value={status === "loading" ? "—" : String(contacts.length)} icon={Users} />
            <StatCard
              label="Open opportunities"
              value={status === "loading" ? "—" : String(getOpenOpportunityCount(opportunities))}
              icon={Handshake}
            />
            <StatCard
              label="Open pipeline value"
              value={
                status === "loading"
                  ? "—"
                  : openPipelineValue.currency
                    ? formatCurrency(openPipelineValue.value, openPipelineValue.currency)
                    : "Multiple currencies"
              }
              icon={ListChecks}
            />
            <StatCard label="Available properties" value={status === "loading" ? "—" : String(availableProperties)} icon={Building2} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <SectionCard title="Overdue tasks" className="xl:col-span-2">
              {status === "loading" ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <OverdueTasksList tasks={overdueTasks} />
              )}
            </SectionCard>

            <SectionCard title="Upcoming appointments">
              {status === "loading" ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <UpcomingAppointmentsList appointments={upcomingAppointments} contactNameById={contactNameById} />
              )}
            </SectionCard>

            <SectionCard title="Pipeline overview">
              {status === "loading" ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : pipelineSummary.rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No opportunities yet.</p>
              ) : (
                <PipelineSummary rows={pipelineSummary.rows} currency={pipelineSummary.currency} />
              )}
            </SectionCard>

            <SectionCard title="AI Assistant">
              <AiAssistantCta />
            </SectionCard>

            <SectionCard title="Recent activity" className="xl:col-span-3">
              {status === "loading" ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <ActivityFeed activity={activity} contactNameById={contactNameById} />
              )}
            </SectionCard>
          </div>
        </>
      )}
    </>
  );
}
