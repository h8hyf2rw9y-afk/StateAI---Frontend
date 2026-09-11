"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, UserRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgentCard } from "@/features/ai/components/agent-card";
import { LeadIntelligencePanel } from "@/features/ai/components/lead-intelligence-panel";
import { FollowUpPanel } from "@/features/ai/components/follow-up-panel";
import { PipelinePanel } from "@/features/ai/components/pipeline-panel";
import { getContacts } from "@/lib/api/contacts";
import { getApiErrorMessage } from "@/lib/api/errors";
import { FormError } from "@/features/auth/components/form-error";
import type { AiAgent } from "@/features/ai/types";
import type { Contact } from "@/features/leads/types";

/**
 * The three real agents this app has today (see app/ai/registry.py's
 * AGENT_REGISTRY, the backend's own source of truth). Static, not fetched —
 * there is no `GET /ai/agents` endpoint, and three fixed cards describing
 * three fixed agents isn't data that needs a round trip. See
 * features/ai/types.ts's AiAgent doc comment.
 */
const AGENTS: AiAgent[] = [
  {
    id: "lead-intelligence",
    name: "Lead Intelligence",
    description: "Judges how important a lead is right now and what to prioritize.",
    icon: "BrainCircuit",
    capabilities: [
      "Reads a contact's full CRM history — buyer requirements, property interests, opportunities, tasks, appointments, and activity",
      "Returns a priority, its reasoning, and a recommended next action",
    ],
    status: "available",
  },
  {
    id: "follow-up",
    name: "Follow-up",
    description: "Decides whether a lead needs follow-up right now, and through which channel.",
    icon: "MessageCircleMore",
    capabilities: [
      "Weighs recent activity and engagement to judge urgency",
      "Suggests a channel, an action, and — when appropriate — a message to review and send yourself",
    ],
    status: "available",
  },
  {
    id: "pipeline",
    name: "Pipeline",
    description: "Analyzes a contact's Opportunities and flags what needs attention.",
    icon: "Waypoints",
    capabilities: [
      "Reasons about every open Opportunity for a contact together, not just one at a time",
      "Returns overall priority, immediate actions, and risk flags per opportunity",
    ],
    status: "available",
  },
];

type Status = "loading" | "success" | "error";

/**
 * Replaces the previous mock/fake AI Assistant page (fake agent cards, fake
 * recommendations, a chat placeholder) — CRM Integration Gaps task. Not a
 * chatbot: this exposes the three real, already-implemented agents exactly
 * as they work (one contact at a time, user-triggered, read-only), reusing
 * the same panels the Lead detail page already uses for the first two —
 * nothing here invents a second AI architecture.
 *
 * The contact picker is deliberately the only new "AI Assistant"-specific
 * piece of UI: pick a real contact from the org's own Contacts (no
 * organization_id is ever sent — see lib/api/contacts.ts), then all three
 * panels below key off that one contactId, same as the Lead detail page's
 * own two panels already do.
 */
export default function AiAssistantPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await getContacts();
      if (cancelled) return;

      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(response.error));
        setStatus("error");
        return;
      }

      setContacts(response.data);
      setStatus("success");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedContact = contacts.find((c) => c.id === selectedContactId) ?? null;

  return (
    <>
      <PageHeader
        title="AI Assistant"
        description="Run the real Lead Intelligence, Follow-up, and Pipeline agents against one of your contacts."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {AGENTS.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      <SectionCard title="Analyze a contact" className="mt-4">
        {status === "loading" && <p className="text-sm text-muted-foreground">Loading contacts…</p>}

        {status === "error" && <FormError message={errorMessage} />}

        {status === "success" && contacts.length === 0 && (
          <EmptyState
            icon={UserRound}
            title="No leads yet"
            description="Add a contact before running an AI analysis."
          />
        )}

        {status === "success" && contacts.length > 0 && (
          <div className="flex flex-col gap-1.5 sm:max-w-sm">
            <Label htmlFor="ai_contact">Contact</Label>
            <Select value={selectedContactId} onValueChange={setSelectedContactId}>
              <SelectTrigger id="ai_contact">
                {/*
                 * A render-prop child, not a bare placeholder: base-ui's
                 * Select.Value can't otherwise reconstruct a selected
                 * SelectItem's label once it's more than one plain-string
                 * text node ({first_name} {last_name} below) — without this,
                 * a real, live check during this task's verification pass
                 * found it silently falls back to rendering the raw
                 * contact_id UUID in the trigger once a contact is picked.
                 * features/pipeline/components/stage-selector.tsx already
                 * establishes this same pattern for a single formatted
                 * string; this does the equivalent lookup for a name. (The
                 * same latent bug exists in OpportunityForm's own contact
                 * picker — out of scope here since it's an already-shipped
                 * file from an earlier task, but worth fixing the same way.)
                 */}
                <SelectValue placeholder="Select a lead to analyze…">
                  {(value: string | null) => {
                    if (!value) return "Select a lead to analyze…";
                    const contact = contacts.find((c) => c.id === value);
                    return contact ? `${contact.first_name} ${contact.last_name}` : "Select a lead to analyze…";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </SectionCard>

      {selectedContact && (
        <>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Analyzing <span className="font-medium text-foreground">{selectedContact.first_name} {selectedContact.last_name}</span>
            </p>
            <Link
              href={`/leads/${selectedContact.id}`}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View full lead
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          {/*
            `key={selectedContact.id}` forces a clean remount of all three
            panels on every client switch — each panel's own `useEffect`
            (keyed on `contactId`) would already reset its state on a plain
            prop change, but keying here removes any doubt that Client A's
            AI result could ever render, even for a frame, while Client B's
            is being restored (see each panel's doc comment and this task's
            "never flash stale content" requirement).
          */}
          <div key={selectedContact.id} className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <LeadIntelligencePanel contactId={selectedContact.id} />
            <FollowUpPanel contactId={selectedContact.id} />
            <PipelinePanel contactId={selectedContact.id} />
          </div>
        </>
      )}
    </>
  );
}
