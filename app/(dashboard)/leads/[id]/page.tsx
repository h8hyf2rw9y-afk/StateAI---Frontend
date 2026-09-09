import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StageBadge } from "@/features/pipeline/components/stage-badge";
import { LeadScoreBadge } from "@/features/leads/components/lead-score-badge";
import { LeadIntelligencePanel } from "@/features/ai/components/lead-intelligence-panel";
import { FollowUpPanel } from "@/features/ai/components/follow-up-panel";
import { mockLeads } from "@/features/leads/mock-data";
import { LEAD_SOURCE_LABELS } from "@/features/leads/types";
import { formatCurrency, getInitials } from "@/lib/format";

/**
 * The lead detail page — this is where a user can request the two real AI
 * agents for one specific contact (see this task's brief). It's also the
 * first per-entity detail page in this app; every other resource so far is
 * list-only (features/leads/components/leads-table.tsx links here).
 *
 * The profile header above is still backed by features/leads/mock-data.ts
 * (the leads list itself isn't wired to the real backend yet — that's a
 * separate, larger task; see the README/report for this one). The AI
 * panels below are real, though: they call the actual backend with `id`
 * from the URL as the contact_id, regardless of whether a matching mock
 * lead was found — so navigating here directly with a real Supabase
 * contact UUID (e.g. a demo contact's id) exercises the real agents even
 * though the mock leads list's own ids don't correspond to real contacts.
 */
export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = mockLeads.find((l) => l.id === id);

  return (
    <>
      <Link
        href="/leads"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to leads
      </Link>

      {lead ? (
        <PageHeader
          title={lead.name}
          description={`${LEAD_SOURCE_LABELS[lead.source]} · ${formatCurrency(lead.budgetMin, lead.currency)} – ${formatCurrency(lead.budgetMax, lead.currency)}`}
          actions={
            <div className="flex items-center gap-3">
              <StageBadge stage={lead.status} />
              <LeadScoreBadge score={lead.score} />
            </div>
          }
        />
      ) : (
        <PageHeader title="Lead" description={`Contact ${id}`} />
      )}

      {lead && (
        <div className="mb-6 flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarFallback>{getInitials(lead.name)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col text-sm">
            <span>{lead.email}</span>
            <span className="text-muted-foreground">{lead.phone}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <LeadIntelligencePanel contactId={id} />
        <FollowUpPanel contactId={id} />
      </div>
    </>
  );
}
