import Link from "next/link";
import { Flame } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { LeadScoreBadge } from "@/features/leads/components/lead-score-badge";
import type { Lead } from "@/features/leads/types";
import { getInitials } from "@/lib/format";

export function HotLeadsList({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return (
      <EmptyState
        icon={Flame}
        title="No hot leads yet"
        description="Leads with a high AI score will surface here as soon as they qualify."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {leads.map((lead) => (
        <li key={lead.id}>
          <Link
            href="/leads"
            className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
          >
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="text-xs">{getInitials(lead.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{lead.name}</p>
              <p className="truncate text-xs text-muted-foreground">{lead.nextAction}</p>
            </div>
            <LeadScoreBadge score={lead.score} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
