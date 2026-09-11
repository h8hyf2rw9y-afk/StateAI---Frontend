import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

const TRADITIONAL = ["Contact", "Deal", "Task", "Close"];
// A deliberately shorter cut of the brief's full workflow — "Coordinate
// visits" (Appointments) and "Continue the relationship" are real parts of
// the product but are already their own moments elsewhere on this page
// (the automation example, the human-side section); repeating all ten here
// would just re-stretch this list past what a comparison diagram needs.
const PROPPILOT = ["Person", "Understand needs", "Match properties", "Build relationship", "Follow up", "Manage opportunity"];

/**
 * Sections 8-9 of the brief, combined: the conceptual difference from a
 * generic CRM, then the anticipated "why not just use HubSpot/Salesforce"
 * question — answered as a real design tradeoff, never as an attack on
 * either product.
 */
export function PhilosophySection() {
  return (
    <section className="border-t border-white/5 bg-card/30 px-4 py-24 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-4xl">
        <Reveal className="text-center">
          <p className="text-sm font-medium text-primary">Why PropPilot exists</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Built around the workflow, not the record.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground text-pretty">
            Most CRMs are organized around records and transactions. PropPilot is organized around how a real
            estate advisor actually works — a relationship that moves through understanding, matching, and
            follow-up long before it becomes a number on a pipeline.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <Reveal className="rounded-2xl border p-6">
            <p className="text-xs font-medium text-muted-foreground uppercase">Traditional CRM</p>
            <div className="mt-4 flex flex-col gap-2">
              {TRADITIONAL.map((step, i) => (
                <div key={step} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px]">
                    {i + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-muted-foreground italic">...then it starts over with the next deal.</p>
          </Reveal>

          <Reveal delay={100} className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
            <p className="text-xs font-medium text-primary uppercase">PropPilot</p>
            <div className="mt-4 flex flex-col gap-2">
              {PROPPILOT.map((step, i) => (
                <div key={step} className="flex items-center gap-2 text-sm">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] text-primary">
                    {i + 1}
                  </span>
                  {step}
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-16 flex flex-col gap-3 rounded-2xl border p-6 sm:flex-row sm:items-start sm:gap-4">
          <ArrowRight className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">Why not just use another CRM?</p>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
              PropPilot wasn&apos;t built to out-feature a generic CRM — the differentiation is real-estate-specific:
              buyer requirements, deterministic property matching, the client/property relationship, and AI that
              reasons over that context specifically, not a general-purpose sales pipeline with real estate labels
              painted on top.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
