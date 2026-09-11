import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Building2,
  CalendarCheck,
  Handshake,
  ListChecks,
  Sparkles,
  UserRound,
  Waypoints,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "Product | PropPilot",
  description: "Everything PropPilot does today, built specifically around real estate advisory work.",
};

const FEATURES = [
  {
    icon: UserRound,
    name: "Contacts & Leads",
    description: "Every client as a real record — roles, contact info, and their full history in one place.",
  },
  {
    icon: ListChecks,
    name: "Buyer Requirements",
    description: "Budget, property type, location, and must-haves captured as structured data a system can act on.",
  },
  {
    icon: Building2,
    name: "Property Matching",
    description: "Deterministic matching against a requirement's real criteria — every match explains exactly why.",
  },
  {
    icon: Waypoints,
    name: "Pipeline & Opportunities",
    description: "A real-estate-specific stage flow for both buy and sell opportunities, from qualification to close.",
  },
  {
    icon: CalendarCheck,
    name: "Tasks & Appointments",
    description: "The concrete next steps and scheduled viewings tied directly to the client and the opportunity.",
  },
  {
    icon: BrainCircuit,
    name: "AI Assistant",
    description: "Three specialized agents — Lead Intelligence, Follow-up, and Pipeline — reasoning over real CRM context.",
  },
  {
    icon: Sparkles,
    name: "Controlled Automation",
    description: "A small set of deterministic, auditable rules — like a follow-up task created after a completed showing.",
  },
  {
    icon: Handshake,
    name: "External Collaboration",
    description: "Track properties from another advisor's inventory separately, without confusing them with your own.",
  },
];

export default function ProductPage() {
  return (
    <>
      <section className="px-4 pt-16 pb-8 text-center lg:px-8 lg:pt-24">
        <Reveal className="mx-auto max-w-2xl">
          <p className="text-sm font-medium text-primary">The product</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Everything you need. Nothing you don&apos;t.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            A modern, intuitive workspace designed around what real estate advisors actually work — every
            capability below is real and working today.
          </p>
        </Reveal>
      </section>

      <section className="px-4 py-16 lg:px-8">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.name} delay={(i % 4) * 75}>
              <Card className="h-full">
                <CardContent className="flex flex-col gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{feature.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                  <Badge variant="outline" className="w-fit border-emerald-500/30 text-[10px] text-emerald-600 dark:text-emerald-400">
                    Available today
                  </Badge>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 text-center lg:px-8 lg:py-24">
        <Reveal>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">See it work with your own contacts.</h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className={buttonVariants({ size: "lg" })}>
              Get Started
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/how-it-works" className={buttonVariants({ variant: "outline", size: "lg" })}>
              See how it works
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
