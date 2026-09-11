import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // min-w-0 break-words, and deliberately NOT field-sizing-content:
        // a <textarea> wraps normal text on its own, but a single
        // unbroken run of characters (no spaces — pasted code, a URL,
        // someone leaning on one key) has no natural break point, so the
        // browser renders it as one long line. `field-sizing: content`
        // (this element's previous sizing, meant to auto-grow height with
        // typed content) turns out to size a textarea's *width* the same
        // way in Chromium: to the natural, unwrapped width of its longest
        // line — completely ignoring width/max-width/min-width, which
        // only clamp a *used* value this sizing mode never produces. That
        // measured (not assumed) behavior is why this element now sizes
        // height with plain min-h-16 + the browser's native resize handle
        // instead. With field-sizing back to its normal "fixed" default,
        // break-words (overflow-wrap: break-word) can actually do its job:
        // it lets the browser break within an unbreakable word when
        // there's nowhere else to break, so the long run wraps inside
        // this element's own (now width%-constrained) box instead of
        // forcing it — and every ancestor row, grid, and Dialog above it —
        // wider than the modal's own max-width (see
        // components/ui/select.tsx's identical fix for the matching
        // long-*selected-value* case).
        "flex min-h-16 w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base break-words transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
