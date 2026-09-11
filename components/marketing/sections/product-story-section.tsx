import type { ReactNode } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  MessageCircleMore,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StageBadge } from "@/features/pipeline/components/stage-badge";
import { Reveal } from "@/components/marketing/reveal";

interface Step {
  eyebrow: string;
  title: string;
  description: string;
  visual: ReactNode;
}

const STEPS: Step[] = [
  {
    eyebrow: "01",
    title: "Meet your client.",
    description:
      "Every relationship starts with a person, not a record. A contact carries their role — buyer, seller, or both — and everything that happens with them from here on stays attached to who they are.",
    visual: (
      <Card>
        <CardContent className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-medium text-primary">
            CM
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Carlos Mendoza</p>
            <p className="text-xs text-muted-foreground">+52 81 5500 0011 &middot; carlos@example.com</p>
          </div>
          <Badge variant="outline">Buyer</Badge>
        </CardContent>
      </Card>
    ),
  },
  {
    eyebrow: "02",
    title: "Understand what they're looking for.",
    description:
      "A Buyer Requirement captures budget, property type, location, and must-haves as structured data — not a note buried in a conversation. It's the same structured requirement the matching engine and the AI agents read from.",
    visual: (
      <Card>
        <CardContent className="flex flex-col gap-2.5">
          <p className="text-sm font-medium">Looking for: House</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border p-2">
              <p className="text-muted-foreground">Budget</p>
              <p className="font-medium text-foreground">$3.2M – $4.5M MXN</p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-muted-foreground">Location</p>
              <p className="font-medium text-foreground">Del Valle, SPGG</p>
            </div>
          </div>
          <Badge variant="outline" className="w-fit border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
            Active requirement
          </Badge>
        </CardContent>
      </Card>
    ),
  },
  {
    eyebrow: "03",
    title: "Find the right property.",
    description:
      "Matching is deterministic, not a guess — every property is checked against the requirement's actual criteria (type, budget, bedrooms, location) and shown with exactly which conditions it meets. No invented score, no black box.",
    visual: (
      <Card>
        <CardContent className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Casa Valle Alto</p>
            <Badge className="border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Match</Badge>
          </div>
          <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" /> Property type matches (house)
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" /> Price is within budget
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" /> Location matches Del Valle
            </li>
          </ul>
        </CardContent>
      </Card>
    ),
  },
  {
    eyebrow: "04",
    title: "Know what deserves attention.",
    description:
      "An overdue task, an upcoming appointment, a lead that's gone quiet — surfaced as real, deterministic signals from your own CRM data, not a noisy feed of everything that happened.",
    visual: (
      <Card>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5 rounded-lg border p-2.5">
            <AlertTriangle className="size-4 shrink-0 text-amber-500" aria-hidden="true" />
            <p className="text-xs">Task overdue: Send Casa Roble brochure</p>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg border p-2.5">
            <CalendarClock className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-xs">Viewing tomorrow, 4:00 PM &middot; Carlos Mendoza</p>
          </div>
        </CardContent>
      </Card>
    ),
  },
  {
    eyebrow: "05",
    title: "Move the opportunity forward.",
    description:
      "Once there's real intent, it becomes an Opportunity — carrying the client, the property, and the buyer requirement together through a real-estate-specific pipeline, from qualification to close.",
    visual: (
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2">
          <StageBadge stage="qualification" />
          <Waypoints className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <StageBadge stage="showing" />
          <Waypoints className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <StageBadge stage="negotiation" />
          <Waypoints className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <StageBadge stage="won" />
        </CardContent>
      </Card>
    ),
  },
  {
    eyebrow: "06",
    title: "Let AI help you reason.",
    description:
      "Three specialized agents read the full context of a lead — their requirements, properties, activity, pipeline — and give you a grounded read: what's the priority, does this lead need a follow-up, what does the pipeline need right now.",
    visual: (
      <Card>
        <CardContent className="flex flex-col gap-2">
          {[
            { icon: BrainCircuit, label: "Lead Intelligence", desc: "Priority & next action" },
            { icon: MessageCircleMore, label: "Follow-up", desc: "Channel & timing" },
            { icon: Waypoints, label: "Pipeline", desc: "Risk & priority per deal" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-2.5 rounded-lg border p-2.5">
              <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{label}</p>
                <p className="text-[11px] text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    ),
  },
  {
    eyebrow: "07",
    title: "Automate the work that shouldn't need another click.",
    description:
      "When a showing is marked complete, PropPilot doesn't wait for you to remember the follow-up — it creates the task automatically, once, and lets you take it from there.",
    visual: (
      <Card>
        <CardContent className="flex items-center gap-2 text-xs">
          <div className="flex flex-1 items-center gap-2 rounded-lg border p-2.5">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-hidden="true" />
            <span>Showing completed</span>
          </div>
          <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="flex flex-1 items-center gap-2 rounded-lg border p-2.5">
            <CalendarCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>Follow-up task created</span>
          </div>
        </CardContent>
      </Card>
    ),
  },
];

/**
 * The scrolling product narrative — the brief's "tell the story through
 * scrolling," sections 1-7. Each step alternates text/visual sides and
 * reveals independently as it enters the viewport (components/marketing/reveal.tsx)
 * rather than being pinned/sticky — a simpler, more robust pattern that
 * still reads as a connected sequence (shared numbering, shared visual
 * language) without the jank risk of scroll-pinned canvases.
 */
export function ProductStorySection() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-24 px-4 py-24 lg:gap-32 lg:px-8 lg:py-32">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium text-primary">How it comes together</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">One system, one story per client.</h2>
      </Reveal>

      {STEPS.map((step, i) => (
        <Reveal
          key={step.eyebrow}
          className={`grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}
        >
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium text-primary">{step.eyebrow}</span>
            <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">{step.title}</h3>
            <p className="text-muted-foreground text-pretty">{step.description}</p>
          </div>
          <div className="mx-auto w-full max-w-sm">{step.visual}</div>
        </Reveal>
      ))}
    </section>
  );
}
