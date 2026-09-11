import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/marketing/reveal";

const EXPLORING = [
  "A client-facing portal for shared visibility into their own search",
  "Deeper client/advisor collaboration on requirements and shortlists",
  "Richer property discovery beyond an advisor's own inventory",
  "Stronger AI reasoning across a client's whole journey, not just one moment",
];

/** Section 15 of the brief — explicitly separated from what's real today (see the badge on each line and this component's own framing). */
export function FutureVisionSection() {
  return (
    <section className="border-t border-white/5 bg-card/30 px-4 py-24 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <p className="text-sm font-medium text-primary">Where PropPilot goes next</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Being explored, not promised.</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground text-pretty">
            Everything described earlier on this page is real and working today. What follows is direction, not a
            shipped feature list.
          </p>
        </Reveal>

        <Reveal className="mt-12 flex flex-col gap-3">
          {EXPLORING.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-xl border p-4">
              <Badge variant="secondary" className="shrink-0">
                Exploring
              </Badge>
              <p className="text-sm text-muted-foreground">{item}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
