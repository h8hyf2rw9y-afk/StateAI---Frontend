"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Transition,
} from "motion/react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Animated delete control — origin design from RareUI, adapted here to this
 * app's own tokens (oklch theme via Tailwind's bg-popover/bg-muted/
 * text-destructive/etc.) instead of RareUI's hardcoded hex palette, and
 * extended for REAL async deletes: `onConfirm` may return a Promise, and the
 * button shows a spinner while it's in flight. A rejection reverts to the
 * closed bin (never shows the "deleted" checkmark for a failed delete) and
 * is handed to `onError` so the caller can show its own message — the same
 * pattern every other destructive action in this app already uses.
 *
 * A click on the trigger opens two small circles (confirm / cancel) instead
 * of deleting immediately — this is also what gives every delete action in
 * the app a confirmation step it previously didn't have.
 */

const HINGE = "3px 6px";
const LID_OPEN = -35;
const WALL_TOP = 6;
const WALL_TOP_OPEN = 13.5;
const WALL_BASE = 20;

const HOLD = { deleted: 1400, kept: 600 };

const EASE = [0.32, 0.72, 0, 1] as const;
const EASE_LID = [0.34, 1.1, 0.64, 1] as const;

const WIDTH = { duration: 0.62, ease: EASE } as const;
const LID = { duration: 0.6, ease: EASE_LID } as const;
const WALL = { duration: 0.56, ease: EASE } as const;
const IN = { duration: 0.44, ease: EASE, delay: 0.14 } as const;
const OUT = { duration: 0.3, ease: EASE } as const;
const TAP = { duration: 0.2, ease: EASE } as const;
const SWAP = { duration: 0.22, ease: EASE } as const;
const SETTLE = { duration: 0.45, ease: EASE } as const;
const SHAKE = { duration: 0.4, ease: EASE } as const;
const PRESS = { type: "spring", stiffness: 520, damping: 18, mass: 0.5 } as const;
const INSTANT = { duration: 0 } as const;

const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-ring";

const SIZES = {
  sm: { tile: 32, panel: 60, mainIcon: 16, circle: "size-6", circleIcon: 12 },
  md: { tile: 48, panel: 84, mainIcon: 20, circle: "size-7", circleIcon: 14 },
} as const;

const ICON = {
  viewBox: "0 0 24 24",
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const panelMotion = {
  hidden: { opacity: 0, x: -6, transition: OUT },
  shown: { opacity: 1, x: 0, transition: { ...IN, staggerChildren: 0.07 } },
};

const circleMotion = {
  hidden: { opacity: 0, scale: 0.9, transition: OUT },
  shown: { opacity: 1, scale: 1, transition: IN },
};

function Circle({
  label,
  circleSize,
  iconSize,
  tone,
  disabled,
  onClick,
  children,
}: {
  label: string;
  circleSize: string;
  iconSize: number;
  tone: "destructive" | "muted";
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <motion.div className="flex" variants={reduced ? undefined : circleMotion}>
      <motion.button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        whileHover={reduced || disabled ? undefined : { scale: 1.03 }}
        whileTap={reduced || disabled ? undefined : { scale: 0.84 }}
        transition={PRESS}
        className={cn(
          "grid place-items-center rounded-full bg-popover shadow-sm ring-1 ring-border transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50",
          circleSize,
          tone === "destructive" ? "text-destructive" : "text-muted-foreground",
          FOCUS
        )}
      >
        <svg {...ICON} width={iconSize} height={iconSize} stroke="currentColor" strokeWidth="3.5">
          {children}
        </svg>
      </motion.button>
    </motion.div>
  );
}

type Status = "idle" | "pending" | "deleted" | "kept";

export type DeleteButtonProps = Omit<
  ComponentProps<"div">,
  "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
> & {
  /** The real delete call. May be async — the button shows a spinner until it settles and only reaches the "deleted" state on success. */
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  /** Called when `onConfirm` rejects, with the thrown error — surface the message the same way any other failed action in this app does. */
  onError?: (error: unknown) => void;
  /** Accessible name of the closed trigger. */
  label?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  size?: keyof typeof SIZES;
  disabled?: boolean;
};

export function DeleteButton({
  className,
  onConfirm,
  onCancel,
  onError,
  label = "Delete",
  confirmLabel = "Confirm delete",
  cancelLabel = "Cancel",
  size = "md",
  disabled,
  ...props
}: DeleteButtonProps) {
  const dims = SIZES[size];
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const trigger = useRef<HTMLButtonElement>(null);
  const timing = (transition: Transition) => (reduced ? INSTANT : transition);

  const top = useMotionValue(WALL_TOP);
  const wall = useTransform(top, (y) => WALL_BASE - y);
  const bin = useMotionTemplate`M19 ${top}v${wall}a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V${top}`;
  const settle = useMotionValue(1);
  const shakeX = useMotionValue(0);

  useEffect(() => {
    const walls = animate(top, open ? WALL_TOP_OPEN : WALL_TOP, reduced ? INSTANT : WALL);
    return () => walls.stop();
  }, [open, reduced, top]);

  useEffect(() => {
    if (status !== "deleted" && status !== "kept") return;
    const nudge = status === "kept" && !reduced ? animate(settle, [1, 0.86, 1], SETTLE) : null;
    const done = setTimeout(() => setStatus("idle"), HOLD[status]);
    return () => {
      nudge?.stop();
      clearTimeout(done);
    };
  }, [status, reduced, settle]);

  async function handleConfirm() {
    setOpen(false);
    if (!onConfirm) {
      setStatus("deleted");
      trigger.current?.focus();
      return;
    }
    setStatus("pending");
    try {
      await onConfirm();
      setStatus("deleted");
    } catch (error) {
      setStatus("idle");
      if (!reduced) void animate(shakeX, [0, -4, 4, -3, 3, 0], SHAKE);
      onError?.(error);
    } finally {
      trigger.current?.focus();
    }
  }

  function handleCancel() {
    setOpen(false);
    setStatus("kept");
    trigger.current?.focus();
    onCancel?.();
  }

  const isPending = status === "pending";
  const isDisabled = Boolean(disabled) || isPending;

  return (
    <motion.div
      data-slot="delete-button"
      data-state={open ? "open" : "closed"}
      data-status={status}
      className={cn("relative h-12 rounded-2xl bg-popover text-muted-foreground shadow-sm ring-1 ring-border", className)}
      style={{ height: dims.tile }}
      animate={{ width: open ? dims.tile + dims.panel : dims.tile }}
      transition={timing(WIDTH)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) handleCancel();
      }}
      {...props}
    >
      <motion.button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-busy={isPending || undefined}
        disabled={isDisabled}
        onClick={() => {
          if (isDisabled) return;
          if (open) return handleCancel();
          setStatus("idle");
          setOpen(true);
        }}
        whileTap={reduced || isDisabled ? undefined : { scale: 0.94 }}
        transition={TAP}
        style={{ width: dims.tile, height: dims.tile, x: shakeX }}
        className={cn("relative z-10 grid place-items-center rounded-2xl disabled:cursor-not-allowed", FOCUS)}
      >
        <AnimatePresence mode="wait" initial={false}>
          {status === "pending" ? (
            <motion.span
              key="pending"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={timing(SWAP)}
            >
              <Loader2 className="animate-spin text-muted-foreground" width={dims.mainIcon} height={dims.mainIcon} aria-hidden="true" />
            </motion.span>
          ) : status === "deleted" ? (
            <motion.svg
              key="done"
              {...ICON}
              width={dims.mainIcon}
              height={dims.mainIcon}
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-destructive"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={timing(SWAP)}
            >
              <motion.path
                d="M4 12.5 9.5 18 20 7"
                initial={reduced ? undefined : { pathLength: 0 }}
                animate={reduced ? undefined : { pathLength: 1 }}
                transition={SETTLE}
              />
            </motion.svg>
          ) : (
            <motion.svg
              key="bin"
              {...ICON}
              width={dims.mainIcon}
              height={dims.mainIcon}
              stroke="currentColor"
              strokeWidth="2"
              className="overflow-visible"
              style={{ scale: settle }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={timing(SWAP)}
            >
              <motion.path d={bin} />
              <motion.g
                style={{ transformBox: "view-box", transformOrigin: HINGE }}
                animate={{ rotate: open ? LID_OPEN : 0 }}
                transition={timing(LID)}
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </motion.g>
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>

      <span role="status" aria-live="polite" className="sr-only">
        {status === "pending" ? "Deleting…" : status === "deleted" ? "Deleted" : status === "kept" ? "Kept" : ""}
      </span>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            style={{ width: dims.panel }}
            className="absolute inset-y-0 right-0 flex items-center justify-center gap-2 rounded-2xl bg-muted"
            variants={reduced ? undefined : panelMotion}
            initial="hidden"
            animate="shown"
            exit="hidden"
          >
            <span
              aria-hidden
              className="absolute -left-1.25 top-1/2 z-20 h-2.5 w-1.5 -translate-y-1/2 bg-muted [clip-path:polygon(100%_0,0_50%,100%_100%)]"
            />
            <Circle label={confirmLabel} circleSize={dims.circle} iconSize={dims.circleIcon} tone="destructive" onClick={handleConfirm}>
              <path d="M4 12.5 9.5 18 20 7" />
            </Circle>
            <Circle label={cancelLabel} circleSize={dims.circle} iconSize={dims.circleIcon} tone="muted" onClick={handleCancel}>
              <path d="M6 6 18 18M18 6 6 18" />
            </Circle>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default DeleteButton;
