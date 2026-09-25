"use client";

import { useEffect, useState } from "react";

/** Small UI-only countdown; the backend remains the authority for limits. */
export function useAiCooldown() {
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (cooldownUntil === 0) return;
    function update() {
      setRemainingSeconds(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));
    }
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  function start(seconds?: number) {
    if (!seconds || seconds <= 0) return;
    setCooldownUntil(Date.now() + seconds * 1000);
    setRemainingSeconds(seconds);
  }

  return { remainingSeconds, isCoolingDown: remainingSeconds > 0, start };
}
