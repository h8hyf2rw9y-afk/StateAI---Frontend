import { Building2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/marketing/reveal";

const STAGES = ["Contacted", "Info requested", "Info received", "Shared with client"];

/**
 * Section 14 of the brief. A real, already-implemented distinction: a
 * property doesn't have to be in an advisor's own inventory to be shared
 * with a client — see Property.ownership_type ("own" | "external") and its
 * collaboration_status soft-enum on the backend.
 */
export function ExternalCollaborationSection() {
  return (
    <section className="px-4 py-24 lg:px-8 lg:py-32">
      <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm font-medium text-primary">Beyond your own inventory</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Not every property you sell is yours to begin with.
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            Advisors regularly work properties from another advisor&apos;s inventory or an external portal —
            getting photos and details, sharing them with a client, and moving toward an appointment. PropPilot
            tracks that collaboration explicitly, separate from your own listings, so it&apos;s never confused with
            inventory you actually own.
          </p>
        </Reveal>

        <Reveal delay={100} className="mx-auto w-full max-w-sm">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-medium">Casa XYZ</p>
                </div>
                <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
                  External
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="size-3.5" aria-hidden="true" />
                Shared by another advisor
              </div>
              <div className="flex flex-col gap-1.5">
                {STAGES.map((stage, i) => (
                  <div key={stage} className="flex items-center gap-2 text-xs">
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${i <= 2 ? "bg-primary" : "border border-muted-foreground"}`}
                    />
                    <span className={i <= 2 ? "text-foreground" : "text-muted-foreground"}>{stage}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
