import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Handshake,
  ListChecks,
  Sparkles,
  UserRound,
  Waypoints,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "How it works | PropPilot",
  description: "From meeting a client to closing the opportunity — the real PropPilot workflow, step by step.",
};

const WORKFLOW = [
  { icon: UserRound, title: "Understand the person", description: "A contact enters the system with their role and context — not just a name and a phone number." },
  { icon: ListChecks, title: "Capture the requirement", description: "Budget, property type, location, and must-haves — structured, so matching and AI can both use it." },
  { icon: Building2, title: "Match the right properties", description: "Every candidate is checked against the requirement's real criteria, with the reasoning shown." },
  { icon: Handshake, title: "Build the relationship", description: "Every interaction — a call, a viewing, a message — becomes part of that client's own history." },
  { icon: CalendarCheck, title: "Coordinate the visit", description: "Appointments tie the client, the property, and (when there is one) the opportunity together." },
  { icon: Waypoints, title: "Manage the opportunity", description: "A real-estate pipeline — qualification through close — not a generic sales stage list." },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="px-4 pt-16 pb-8 text-center lg:px-8 lg:pt-24">
        <Reveal className="mx-auto max-w-2xl">
          <p className="text-sm font-medium text-primary">How it works</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            From person to relationship.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            PropPilot follows the actual shape of a real estate advisor&apos;s work — not a generic sales funnel
            with real estate labels on it.
          </p>
        </Reveal>
      </section>

      <section className="px-4 py-16 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {WORKFLOW.map((step, i) => (
            <Reveal key={step.title} className="flex gap-5">
              <div className="flex flex-col items-center">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <step.icon className="size-4.5" aria-hidden="true" />
                </span>
                {i < WORKFLOW.length - 1 && <span className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />}
              </div>
              <div className="pb-10">
                <p className="text-sm font-medium text-muted-foreground">Step {i + 1}</p>
                <p className="mt-0.5 text-lg font-medium">{step.title}</p>
                <p className="mt-1 text-sm text-muted-foreground text-pretty">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-white/5 bg-card/30 px-4 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl">
          <Reveal className="text-center">
            <p className="text-sm font-medium text-primary">A real example</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              The work that shouldn&apos;t need another click.
            </h2>
          </Reveal>

          <Reveal delay={100} className="mt-8">
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-4 sm:flex-row sm:gap-2">
                <div className="flex flex-1 items-center gap-2.5 rounded-lg border p-3">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                  <span className="text-sm">Showing marked complete</span>
                </div>
                <ArrowRight className="size-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" aria-hidden="true" />
                <div className="flex flex-1 items-center gap-2.5 rounded-lg border p-3">
                  <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="text-sm">PropPilot checks it hasn&apos;t already been handled</span>
                </div>
                <ArrowRight className="size-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" aria-hidden="true" />
                <div className="flex flex-1 items-center gap-2.5 rounded-lg border p-3">
                  <CalendarCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="text-sm">Follow-up task created for you</span>
                </div>
              </CardContent>
            </Card>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Deterministic, auditable, and undone by nothing except you completing the task.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-16 text-center lg:px-8 lg:py-24">
        <Reveal>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready to see your own workflow in it?</h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className={buttonVariants({ size: "lg" })}>
              Get Started
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/product" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Explore the product
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
