"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Calendar, Handshake, Pencil, Percent, UserRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/features/auth/components/form-error";
import { StageBadge } from "@/features/pipeline/components/stage-badge";
import { StageSelector } from "@/features/pipeline/components/stage-selector";
import { OpportunityForm } from "@/features/pipeline/components/opportunity-form";
import { OpportunityActivityList } from "@/features/pipeline/components/opportunity-activity-list";
import { OpportunityTaskList } from "@/features/pipeline/components/opportunity-task-list";
import { OpportunityAppointmentList } from "@/features/pipeline/components/opportunity-appointment-list";
import { PipelinePanel } from "@/features/ai/components/pipeline-panel";
import {
  getOpportunity,
  getOpportunityActivities,
  getTasksForOpportunity,
  getAppointmentsForOpportunity,
} from "@/lib/api/pipeline";
import { getContact } from "@/lib/api/contacts";
import { getProperty } from "@/lib/api/properties";
import { getBuyerRequirement } from "@/lib/api/buyer-requirements";
import {
  formatOpportunityLostReason,
  formatOpportunityType,
  formatOpportunityValue,
  type Activity,
  type Opportunity,
  type OpportunityAppointment,
  type OpportunityTask,
} from "@/features/pipeline/types";
import { formatBudgetRange, formatPurpose, type BuyerRequirement } from "@/features/buyer-requirements/types";
import type { Contact } from "@/features/leads/types";
import type { Property } from "@/features/properties/types";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatTimestamp } from "@/lib/format";
import { useUser } from "@/hooks/useUser";

type Status = "loading" | "success" | "error";

/** No `/users` list endpoint exists backend-side (see app/api/routes/me.py — only the caller's own identity is exposed), so any owner other than the signed-in user can't be resolved to a real name — this never fabricates one, it just says whether it's you. */
function getOwnerLabel(opportunity: Opportunity, currentUserId: string | undefined): string {
  if (opportunity.owner_user_id === null) return "Unassigned";
  if (opportunity.owner_user_id === currentUserId) return "You";
  return "Another team member";
}

/**
 * The opportunity detail page — same Client-Component-with-`use(params)`
 * architecture as app/(dashboard)/leads/[id]/page.tsx and
 * app/(dashboard)/properties/[id]/page.tsx: fetch on mount, loading/error/
 * not-found states, only `opportunity_id` (from the URL) ever sent — the
 * backend alone decides whether it belongs to the caller's organization.
 *
 * Once the opportunity itself loads, its related Contact (always present —
 * `contact_id` is required on every Opportunity), Property/BuyerRequirement
 * (only if referenced), Activities, Tasks, and Appointments are fetched
 * together in a second pass. A failure in any of the *secondary* fetches
 * doesn't fail the whole page — the opportunity itself, and whichever
 * related data did load, still renders; only the primary opportunity fetch
 * failing shows the page-level error state, same principle
 * PipelineBoard applies to its own contact/property name lookups.
 */
export default function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();

  const [status, setStatus] = useState<Status>("loading");
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [contact, setContact] = useState<Contact | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [buyerRequirement, setBuyerRequirement] = useState<BuyerRequirement | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<OpportunityTask[]>([]);
  const [appointments, setAppointments] = useState<OpportunityAppointment[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const opportunityRes = await getOpportunity(id);
      if (cancelled) return;

      if (!opportunityRes.ok) {
        setErrorMessage(getApiErrorMessage(opportunityRes.error));
        setStatus("error");
        return;
      }

      const loaded = opportunityRes.data;
      setOpportunity(loaded);
      setStatus("success");

      const [contactRes, propertyRes, requirementRes, activitiesRes, tasksRes, appointmentsRes] = await Promise.all([
        getContact(loaded.contact_id),
        loaded.property_id ? getProperty(loaded.property_id) : Promise.resolve(null),
        loaded.buyer_requirement_id ? getBuyerRequirement(loaded.buyer_requirement_id) : Promise.resolve(null),
        getOpportunityActivities(loaded.id),
        getTasksForOpportunity(loaded.id),
        getAppointmentsForOpportunity(loaded.id),
      ]);
      if (cancelled) return;

      if (contactRes.ok) setContact(contactRes.data);
      if (propertyRes?.ok) setProperty(propertyRes.data);
      if (requirementRes?.ok) setBuyerRequirement(requirementRes.data);
      if (activitiesRes.ok) setActivities(activitiesRes.data);
      if (tasksRes.ok) setTasks(tasksRes.data);
      if (appointmentsRes.ok) setAppointments(appointmentsRes.data);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <Link
        href="/pipeline"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to pipeline
      </Link>

      {status === "loading" && (
        <div className="flex flex-col items-center gap-2 rounded-xl border py-16 text-center">
          <Handshake className="size-5 animate-pulse text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Loading opportunity…</p>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-xl border p-6">
          <FormError message={errorMessage} />
        </div>
      )}

      {status === "success" && opportunity === null && (
        <EmptyState icon={Handshake} title="Opportunity not found" description="This opportunity may have been removed." />
      )}

      {status === "success" && opportunity && (
        <>
          <PageHeader
            title={opportunity.title}
            description={`${formatOpportunityType(opportunity.opportunity_type)} opportunity · Created ${formatTimestamp(opportunity.created_at)}`}
            actions={
              <div className="flex items-center gap-1.5">
                <StageBadge stage={opportunity.stage} />
                <OpportunityForm
                  opportunity={opportunity}
                  onSaved={setOpportunity}
                  trigger={
                    <Button size="sm" variant="outline">
                      <Pencil />
                      Edit
                    </Button>
                  }
                />
              </div>
            }
          />

          <div className="mb-6">
            <StageSelector opportunity={opportunity} onUpdated={setOpportunity} />
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Expected value</p>
              <p className="mt-0.5 text-sm font-semibold">
                {formatOpportunityValue(opportunity.expected_value, opportunity.currency)}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase">
                <Percent className="size-3" /> Probability
              </p>
              <p className="mt-0.5 text-sm font-semibold">
                {opportunity.probability !== null ? `${opportunity.probability}%` : "Not set"}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase">
                <Calendar className="size-3" /> Expected close
              </p>
              <p className="mt-0.5 text-sm font-semibold">
                {opportunity.expected_close_date ? formatTimestamp(opportunity.expected_close_date) : "Not set"}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase">
                <UserRound className="size-3" /> Owner
              </p>
              <p className="mt-0.5 text-sm font-semibold">{getOwnerLabel(opportunity, user?.id)}</p>
            </div>
          </div>

          {opportunity.stage === "lost" && opportunity.lost_reason && (
            <div className="mb-6">
              <Badge variant="destructive">Lost: {formatOpportunityLostReason(opportunity.lost_reason)}</Badge>
            </div>
          )}

          {opportunity.description && <p className="mb-6 max-w-2xl text-sm">{opportunity.description}</p>}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SectionCard title="Contact">
              {contact ? (
                <Link href={`/leads/${contact.id}`} className="flex items-center gap-1.5 text-sm font-medium hover:underline">
                  <UserRound className="size-4 text-muted-foreground" />
                  {contact.first_name} {contact.last_name}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
            </SectionCard>

            <SectionCard title="Property">
              {opportunity.property_id ? (
                property ? (
                  <Link
                    href={`/properties/${property.id}`}
                    className="flex items-center gap-1.5 text-sm font-medium hover:underline"
                  >
                    <Building2 className="size-4 text-muted-foreground" />
                    {property.title}
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">No property linked.</p>
              )}
            </SectionCard>

            <SectionCard title="Buyer requirement">
              {opportunity.buyer_requirement_id ? (
                buyerRequirement ? (
                  <Link href={`/leads/${buyerRequirement.contact_id}`} className="flex flex-col gap-0.5 text-sm hover:underline">
                    <span className="font-medium">{formatPurpose(buyerRequirement.purpose)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatBudgetRange(buyerRequirement.budget_min, buyerRequirement.budget_max, buyerRequirement.currency)}
                    </span>
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">No buyer requirement linked.</p>
              )}
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <SectionCard title="Tasks">
              <OpportunityTaskList tasks={tasks} />
            </SectionCard>
            <SectionCard title="Appointments">
              <OpportunityAppointmentList appointments={appointments} />
            </SectionCard>
            <SectionCard title="Activity & stage history">
              <OpportunityActivityList activities={activities} />
            </SectionCard>
          </div>

          {/*
            Phase 8: the Pipeline Agent already existed as a real,
            user-triggered panel on /ai-assistant (features/ai/components/pipeline-panel.tsx,
            unmodified here) but had no surface on the one page where an
            agent deciding "what should I do with this opportunity" would
            actually look first. It reasons about the whole contact's
            pipeline at once (see that component's own docstring), not only
            this one opportunity — the note below says so rather than
            implying a narrower scope than what it actually returns.
          */}
          <div className="mt-4 max-w-2xl">
            <p className="mb-2 text-xs text-muted-foreground">
              The Pipeline Agent analyzes all of this contact&apos;s opportunities together, not just this one.
            </p>
            <PipelinePanel contactId={opportunity.contact_id} />
          </div>
        </>
      )}
    </>
  );
}
