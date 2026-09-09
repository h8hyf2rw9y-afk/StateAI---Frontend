"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, UserRound } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FormError } from "@/features/auth/components/form-error";
import { LeadIntelligencePanel } from "@/features/ai/components/lead-intelligence-panel";
import { FollowUpPanel } from "@/features/ai/components/follow-up-panel";
import { getContact } from "@/lib/api/contacts";
import { formatContactRole, formatContactSource, type Contact } from "@/features/leads/types";
import { getApiErrorMessage } from "@/lib/api/errors";
import { formatTimestamp, getInitials } from "@/lib/format";

type Status = "loading" | "success" | "error";

/**
 * The lead detail page — real backend contact data plus the two real AI
 * agents for that one contact. This is the first per-entity detail page in
 * this app; every other resource so far is list-only.
 *
 * A Client Component page (not the usual Server Component + client
 * sub-components split): fetching the contact needs the browser's Supabase
 * session for apiRequest's bearer token (see lib/api/client.ts), the same
 * reason the AI panels below are themselves client components. `id` comes
 * straight from the URL and is passed to both the contact fetch and the AI
 * panels — the backend alone decides whether it's a real, authorized
 * contact; the frontend never asserts that itself.
 */
export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [status, setStatus] = useState<Status>("loading");
  const [contact, setContact] = useState<Contact | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await getContact(id);
      if (cancelled) return;

      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(response.error));
        setStatus("error");
        return;
      }

      setContact(response.data);
      setStatus("success");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <Link
        href="/leads"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to leads
      </Link>

      {status === "loading" && (
        <div className="flex flex-col items-center gap-2 rounded-xl border py-16 text-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Loading lead…</p>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-xl border p-6">
          <FormError message={errorMessage} />
        </div>
      )}

      {status === "success" && contact === null && (
        <EmptyState icon={UserRound} title="Lead not found" description="This lead may have been removed." />
      )}

      {status === "success" && contact && (
        <>
          <PageHeader
            title={`${contact.first_name} ${contact.last_name}`}
            description={`${formatContactSource(contact.source)} · Added ${formatTimestamp(contact.created_at)}`}
            actions={
              <div className="flex flex-wrap items-center gap-1.5">
                {contact.roles.map((role) => (
                  <Badge key={role.role_key} variant="outline">
                    {formatContactRole(role.role_key)}
                  </Badge>
                ))}
              </div>
            }
          />

          <div className="mb-6 flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback>{getInitials(`${contact.first_name} ${contact.last_name}`)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col text-sm">
              <span>{contact.email ?? "No email on file"}</span>
              <span className="text-muted-foreground">{contact.phone ?? "No phone on file"}</span>
            </div>
          </div>

          {contact.notes && (
            <p className="mb-6 max-w-2xl text-sm text-muted-foreground">{contact.notes}</p>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <LeadIntelligencePanel contactId={contact.id} />
            <FollowUpPanel contactId={contact.id} />
          </div>
        </>
      )}
    </>
  );
}
