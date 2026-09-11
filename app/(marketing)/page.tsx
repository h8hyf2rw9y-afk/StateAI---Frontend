import type { Metadata } from "next";
import { HeroSection } from "@/components/marketing/sections/hero-section";
import { ProductStorySection } from "@/components/marketing/sections/product-story-section";
import { PhilosophySection } from "@/components/marketing/sections/philosophy-section";
import { HumanSideSection } from "@/components/marketing/sections/human-side-section";
import { AiCapabilitiesSection } from "@/components/marketing/sections/ai-capabilities-section";
import { ExternalCollaborationSection } from "@/components/marketing/sections/external-collaboration-section";
import { FutureVisionSection } from "@/components/marketing/sections/future-vision-section";
import { FinalCtaSection } from "@/components/marketing/sections/final-cta-section";

export const metadata: Metadata = {
  title: "PropPilot | State AI",
  description:
    "PropPilot is an AI-powered real estate operating system, built around how advisors actually work — the client, their requirements, the right property, and every follow-up in between.",
};

/**
 * The public homepage — replaces the previous app/page.tsx, which only
 * ever redirected to /dashboard or /login and showed a visitor nothing.
 * This is the "tell the product story by scrolling" experience described
 * in the redesign brief: one continuous narrative, not a click-through
 * dashboard-lookalike. See app/(marketing)/layout.tsx for why this lives
 * in its own route group.
 */
export default function MarketingHomePage() {
  return (
    <>
      <HeroSection />
      <ProductStorySection />
      <PhilosophySection />
      <HumanSideSection />
      <AiCapabilitiesSection />
      <ExternalCollaborationSection />
      <FutureVisionSection />
      <FinalCtaSection />
    </>
  );
}
