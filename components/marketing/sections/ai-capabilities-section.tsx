import { BrainCircuit, MessageCircleMore, ShieldCheck, Waypoints } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Reveal } from "@/components/marketing/reveal";

const AGENTS = [
  {
    icon: BrainCircuit,
    name: "Lead Intelligence",
    description: "Judges how important a lead is right now, and what to prioritize — with its reasoning shown, not just a score.",
  },
  {
    icon: MessageCircleMore,
    name: "Follow-up",
    description: "Decides whether a lead needs follow-up right now, through which channel, and drafts a message for you to review.",
  },
  {
    icon: Waypoints,
    name: "Pipeline",
    description: "Reasons about every open opportunity together — priority, risk flags, and what to do next on each.",
  },
];

/**
 * Sections 12-13 of the brief. The central honesty constraint from the
 * product brief: never claim "AI runs your business" — only that it helps
 * the advisor reason, and that a narrow, deterministic slice of repetitive
 * work can run on its own, separately and visibly.
 */
export function AiCapabilitiesSection() {
  return (
    <section className="border-t border-white/5 bg-card/30 px-4 py-24 lg:px-8 lg:py-32">
      <div className="mx-auto max-w-5xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-primary">AI, honestly</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Not a chatbot bolted onto a CRM.
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            Every agent reads the same structured context — the client, their requirement, matched properties,
            opportunities, activity, tasks, and appointments — and reasons over that, on demand, when you ask it
            to. AI helps you understand what&apos;s happening and decide what to do next. It doesn&apos;t run your
            business for you.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {AGENTS.map((agent, i) => (
            <Reveal key={agent.name} delay={i * 100}>
              <Card className="h-full">
                <CardContent className="flex flex-col gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <agent.icon className="size-4.5" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-medium">{agent.name}</p>
                  <p className="text-sm text-muted-foreground">{agent.description}</p>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-8 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">Controlled automation, separate from AI judgment</p>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
              A small set of repetitive, well-defined actions run deterministically — like creating a follow-up
              task the moment a showing is marked complete. These rules are auditable and don&apos;t involve the AI
              agents deciding anything; every AI recommendation still needs a human to act on it.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
