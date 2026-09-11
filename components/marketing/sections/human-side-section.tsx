import { Reveal } from "@/components/marketing/reveal";

/**
 * Sections 10-11 of the brief: the human side of a real estate transaction,
 * and honest framing of the product's origin — kept concise and
 * sophisticated rather than sentimental, and with no fabricated numbers,
 * customers, or testimonials (see section 22).
 */
export function HumanSideSection() {
  return (
    <section className="px-4 py-24 lg:px-8 lg:py-32">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-16 lg:grid-cols-2">
        <Reveal>
          <p className="text-sm font-medium text-primary">The human side</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            A property isn&apos;t just a property.
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            For most clients, it&apos;s where their family will grow, a major financial decision, and one of the
            most significant moments in their life. PropPilot is built to help the advisor understand the
            <span className="text-foreground"> client</span>, not just track the deal.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <p className="text-sm font-medium text-primary">Why it exists</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Built from the actual workflow.
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            PropPilot came out of real, hands-on real estate advisory work — managing clients, understanding buyer
            requirements, searching for properties (including ones outside personal inventory), following up, and
            coordinating appointments, all of it needing context that generic tools didn&apos;t provide. No
            fabricated customer numbers here — just the workflow it was actually built to support.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
