import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "About | PropPilot",
  description: "Why PropPilot exists, and where it's honestly headed.",
};

const EXPLORING = [
  "A client-facing portal for shared visibility into their own search",
  "Deeper client/advisor collaboration on requirements and shortlists",
  "Richer property discovery beyond an advisor's own inventory",
  "Stronger AI reasoning across a client's whole journey",
];

export default function AboutPage() {
  return (
    <section className="px-4 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-2xl">
        <Reveal>
          <p className="text-sm font-medium text-primary">About PropPilot</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Built from the work itself.
          </h1>
        </Reveal>

        <Reveal delay={100} className="mt-8 flex flex-col gap-5 text-muted-foreground">
          <p className="text-pretty">
            PropPilot started from real, hands-on real estate advisory work — not from a generic CRM feature list.
            Managing clients, understanding what they were actually looking for, searching for properties
            (including ones outside personal inventory), following up, and coordinating appointments all needed a
            kind of context that off-the-shelf tools didn&apos;t provide.
          </p>
          <p className="text-pretty">
            A property isn&apos;t just a listing. For most clients it&apos;s where their family will grow, a major
            financial decision, and one of the more significant moments in their life. The advisor&apos;s job is to
            understand the person behind that decision — so that&apos;s what the system was built to help with
            first, before anything else.
          </p>
          <p className="text-pretty">
            That&apos;s also why this page doesn&apos;t carry customer counts, revenue figures, or testimonials.
            None of that exists to point to yet, and inventing it would defeat the point. What&apos;s described on
            this site is what&apos;s real and working today — see{" "}
            <Link href="/product" className="text-foreground underline underline-offset-4">
              the product
            </Link>{" "}
            for exactly what that is.
          </p>
        </Reveal>

        <Reveal delay={200} className="mt-14">
          <p className="text-sm font-medium">Where it&apos;s honestly headed</p>
          <div className="mt-4 flex flex-col gap-3">
            {EXPLORING.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border p-4">
                <Badge variant="secondary" className="shrink-0">
                  Exploring
                </Badge>
                <p className="text-sm text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={300} className="mt-14">
          <Link href="/register" className={buttonVariants({ size: "lg" })}>
            Get Started
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
