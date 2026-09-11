import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";

export function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden px-4 py-24 text-center lg:px-8 lg:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_60%_60%_at_50%_100%,color-mix(in_oklch,var(--primary),transparent_82%),transparent)]"
      />
      <Reveal className="mx-auto max-w-2xl">
        <h2 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Start understanding your clients.
        </h2>
        <p className="mt-4 text-lg text-muted-foreground text-pretty">
          Set up your PropPilot workspace in minutes — no credit card required.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className={buttonVariants({ size: "lg" })}>
            Get Started
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Log in
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
