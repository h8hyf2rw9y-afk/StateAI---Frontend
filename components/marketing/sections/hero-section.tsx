import Link from "next/link";
import { ArrowRight, BrainCircuit, CalendarCheck, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The hero's "product panel" is a restrained, illustrative composition of
 * real STATE AI concepts (a lead's priority + AI reasoning, a
 * deterministic automation event, a property match) — not a literal
 * screenshot, and not a set of invented metrics. "Carlos Mendoza" mirrors
 * the sample-contact naming already used elsewhere in this app's own
 * demo/seed data, not a real customer. See the section 7/22 constraints
 * in the product brief: real product concepts, no fabricated numbers.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-24 lg:px-8 lg:pt-24 lg:pb-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_78%),transparent)]"
      />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-8">
        <div className="flex flex-col items-start gap-6">
          <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary">
            <Sparkles className="size-3" aria-hidden="true" />
            AI-native real estate operating system
          </Badge>

          <h1 className="text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Real estate,
            <br />
            understood.
          </h1>

          <p className="max-w-lg text-lg text-muted-foreground text-pretty">
            PropPilot connects your clients, their requirements, the properties that fit, and every follow-up
            in between — so the system always understands the full relationship, not just the transaction.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/register" className={buttonVariants({ size: "lg" })}>
              Get Started
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/how-it-works" className={buttonVariants({ variant: "outline", size: "lg" })}>
              See how it works
            </Link>
          </div>

          <Link href="/login" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Already have a workspace? Log in
          </Link>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:mx-0">
          <Card className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both shadow-2xl shadow-primary/10 duration-700">
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Carlos Mendoza</p>
                  <p className="text-xs text-muted-foreground">Buyer &middot; Del Valle, San Pedro</p>
                </div>
                <Badge className="border-transparent bg-red-500/15 text-red-600 dark:text-red-400">High priority</Badge>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3">
                <BrainCircuit className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-xs text-foreground">
                  <span className="font-medium">AI insight —</span> active buyer requirement, viewed 2 properties this
                  week. Recommend a follow-up call.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="rounded-lg border p-2.5">
                  <p className="font-medium text-foreground">Budget</p>
                  <p>$3.2M – $4.5M MXN</p>
                </div>
                <div className="rounded-lg border p-2.5">
                  <p className="font-medium text-foreground">Matches</p>
                  <p>3 properties</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="absolute -right-6 -top-6 hidden w-52 animate-in fade-in slide-in-from-top-2 fill-mode-both bg-card/95 shadow-lg duration-700 sm:block"
            style={{ animationDelay: "450ms" }}
          >
            <CardContent className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                <CalendarCheck className="size-3.5" aria-hidden="true" />
              </span>
              <p className="text-xs font-medium">Follow-up task created after showing</p>
            </CardContent>
          </Card>

          <Card
            className="absolute -bottom-6 -left-6 hidden w-48 animate-in fade-in slide-in-from-bottom-2 fill-mode-both bg-card/95 shadow-lg duration-700 sm:block"
            style={{ animationDelay: "650ms" }}
          >
            <CardContent className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Sparkles className="size-3.5" aria-hidden="true" />
              </span>
              <p className="text-xs font-medium">3 properties match this requirement</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
