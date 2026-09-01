import Link from "next/link";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { Lead } from "@/features/leads/types";
import type { Appointment } from "@/features/appointments/types";
import type { AiRecommendation } from "@/features/ai/types";
import { getDueFollowUps, getUpcomingAppointments } from "@/features/dashboard/lib";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Emphasis = "high" | "medium" | "default";

interface PriorityRow {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  emphasis: Emphasis;
}

const EMPHASIS_LABEL: Record<Emphasis, string> = {
  high: "High priority",
  medium: "Medium priority",
  default: "Upcoming",
};

const EMPHASIS_STYLES: Record<Emphasis, string> = {
  high: "bg-red-500/15 text-red-300",
  medium: "bg-amber-500/15 text-amber-300",
  default: "bg-primary/15 text-primary",
};

/**
 * The dashboard's core "tell the agent what to do next" surface. It merges
 * three different mock sources — leads with a due follow-up, today's
 * appointments, and high-priority AI recommendations — into one ranked
 * list instead of three separate stat blocks.
 */
export function PrioritiesList({
  leads,
  appointments,
  recommendations,
}: {
  leads: Lead[];
  appointments: Appointment[];
  recommendations: AiRecommendation[];
}) {
  const today = new Date().toISOString().slice(0, 10);

  const rows: PriorityRow[] = [
    ...recommendations
      .filter((rec) => rec.priority === "high")
      .map((rec): PriorityRow => ({
        id: rec.id,
        title: rec.title,
        subtitle: rec.description,
        href: "/ai-assistant",
        emphasis: "high",
      })),
    ...getDueFollowUps(leads).map((lead): PriorityRow => ({
      id: lead.id,
      title: `Follow up with ${lead.name}`,
      subtitle: lead.nextAction,
      href: "/leads",
      emphasis: lead.followUpDate && lead.followUpDate < today ? "high" : "medium",
    })),
    ...getUpcomingAppointments(appointments, 3).map((appt): PriorityRow => ({
      id: appt.id,
      title: appt.title,
      subtitle: `${appt.date === today ? "Today" : formatShortDate(appt.date)} at ${appt.time} · ${appt.leadName}`,
      href: "/appointments",
      emphasis: "default",
    })),
  ].slice(0, 6);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="You're all caught up"
        description="No urgent follow-ups, appointments, or recommendations right now."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {rows.map((row, index) => (
        <li key={`${row.href}-${row.id}`}>
          <Link
            href={row.href}
            className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{row.title}</p>
              <p className="truncate text-xs text-muted-foreground">{row.subtitle}</p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
                EMPHASIS_STYLES[row.emphasis]
              )}
            >
              {EMPHASIS_LABEL[row.emphasis]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
