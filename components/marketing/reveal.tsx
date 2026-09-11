"use client";

import type { ElementType, ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";

/**
 * The one motion primitive the whole marketing site is built from: fade in
 * + rise 16px, once, when scrolled into view. Deliberately restrained (see
 * the product brief's "Apple-level restraint") — no bounce, no scale, no
 * per-word stagger. `delay` (ms) is the only variation, used to stagger a
 * handful of siblings (e.g. three feature cards) without each needing its
 * own observer-timing logic.
 *
 * `motion-reduce:` variants make the reduced-motion fallback a plain,
 * instant appearance — this is the second of the two layers described in
 * useInView's docstring (the first being useInView returning `true`
 * immediately, skipping the observer entirely).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: ElementType;
}) {
  const { ref, isInView } = useInView<HTMLDivElement>();

  return (
    <Tag
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out motion-reduce:transition-none",
        isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className
      )}
      style={{ transitionDelay: isInView && delay ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  );
}
