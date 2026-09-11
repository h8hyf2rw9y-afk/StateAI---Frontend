"use client";

import { useEffect, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Marketing-site-only scroll-reveal primitive. No animation library exists
 * in this project (see package.json) and this doesn't need one — a single
 * IntersectionObserver per element, backed by native CSS transitions, is
 * cheaper and simpler than pulling in framer-motion/gsap for what is really
 * just "fade+rise in once when scrolled into view."
 *
 * Reports `true` exactly once (`triggerOnce`, the only mode used here) —
 * scroll storytelling should settle once a section has been seen, not
 * replay every time the visitor scrolls back past it.
 *
 * Honors `prefers-reduced-motion`: when set, this returns `true`
 * immediately on mount instead of observing anything, so reduced-motion
 * visitors see final content right away with no animation at all (see
 * components/marketing/reveal.tsx, which also shortens its own transition
 * under the same media query as a second layer of defense).
 */
export function useInView<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  // Lazy initializer (runs once, synchronously, during the first render —
  // not a setState-in-effect) so a reduced-motion visitor never observes
  // anything at all; the effect below simply has nothing to do in that case.
  const [isInView, setIsInView] = useState(prefersReducedMotion);

  useEffect(() => {
    const node = ref.current;
    if (!node || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px", ...options }
    );

    observer.observe(node);
    return () => observer.disconnect();
    // isInView is intentionally excluded: it's read only to skip re-observing
    // once already true, and the observer's own callback is what sets it —
    // including it here would tear down and reattach the observer as soon as
    // it fires, right when its `disconnect()` cleanup makes that moot anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  return { ref, isInView };
}
