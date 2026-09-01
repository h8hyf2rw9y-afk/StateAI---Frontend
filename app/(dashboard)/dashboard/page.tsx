import Link from "next/link";
import { Building2, Flame, Handshake, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { PrioritiesList } from "@/features/dashboard/components/priorities-list";
import { HotLeadsList } from "@/features/dashboard/components/hot-leads-list";
import { UpcomingAppointmentsList } from "@/features/dashboard/components/upcoming-appointments-list";
import { PipelineSummary } from "@/features/dashboard/components/pipeline-summary";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import { RecommendationList } from "@/features/ai/components/recommendation-list";
import { getHotLeads, getOpenPipelineValue, getPipelineSummary, getUpcomingAppointments } from "@/features/dashboard/lib";
import { mockActivity } from "@/features/dashboard/mock-data";
import { mockLeads } from "@/features/leads/mock-data";
import { mockProperties } from "@/features/properties/mock-data";
import { mockDeals } from "@/features/pipeline/mock-data";
import { mockAppointments } from "@/features/appointments/mock-data";
import { mockRecommendations } from "@/features/ai/mock-data";
import { createClient } from "@/lib/supabase/server";
import { getDisplayName } from "@/features/auth/lib";
import { formatCurrency } from "@/lib/format";

export default async function DashboardPage() {
  // proxy.ts already guarantees a session before this page can render — see
  // lib/supabase/proxy.ts — so this is just for display, not access control.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const firstName = getDisplayName(user).split(" ")[0];
  const hotLeads = getHotLeads(mockLeads);
  const upcomingAppointments = getUpcomingAppointments(mockAppointments);
  const pipelineSummary = getPipelineSummary(mockDeals);
  const openPipelineValue = getOpenPipelineValue(mockDeals);
  const availableProperties = mockProperties.filter((p) => p.status === "available").length;

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's what needs your attention today."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active leads" value={String(mockLeads.filter((l) => !["won", "lost"].includes(l.status)).length)} icon={Users} />
        <StatCard label="Hot leads" value={String(mockLeads.filter((l) => l.score >= 80).length)} icon={Flame} trend={{ value: "+2 this week", direction: "up" }} />
        <StatCard label="Open pipeline value" value={formatCurrency(openPipelineValue)} icon={Handshake} trend={{ value: "+8% this month", direction: "up" }} />
        <StatCard label="Available properties" value={String(availableProperties)} icon={Building2} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard
          title="Today's priorities"
          className="xl:col-span-2"
          action={
            <Button variant="ghost" size="sm" render={<Link href="/ai-assistant" />}>
              View all recommendations
            </Button>
          }
        >
          <PrioritiesList
            leads={mockLeads}
            appointments={mockAppointments}
            recommendations={mockRecommendations}
          />
        </SectionCard>

        <SectionCard title="Upcoming appointments">
          <UpcomingAppointmentsList appointments={upcomingAppointments} />
        </SectionCard>

        <SectionCard title="Hot leads">
          <HotLeadsList leads={hotLeads} />
        </SectionCard>

        <SectionCard title="Pipeline overview">
          <PipelineSummary summary={pipelineSummary} />
        </SectionCard>

        <SectionCard title="AI recommendations">
          <RecommendationList recommendations={mockRecommendations} />
        </SectionCard>

        <SectionCard title="Recent activity" className="xl:col-span-3">
          <ActivityFeed activity={mockActivity} />
        </SectionCard>
      </div>
    </>
  );
}
