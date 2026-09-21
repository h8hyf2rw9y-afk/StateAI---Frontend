import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * Test-only stand-in for components/ui/popover.tsx, used via
 * `vi.mock("@/components/ui/popover", () => import("@/tests/test-utils/popover-stub"))`
 * — the same convention as select-stub.tsx, for the same reason: the real
 * component is built on @base-ui/react/popover, whose portal + positioner
 * (floating-ui, ResizeObserver) crashes the jsdom worker as soon as it opens.
 * This keeps the public contract the app uses — `Popover` /
 * `PopoverTrigger render={<Button/>}` / `PopoverContent` — and reproduces the
 * behavior the tests rely on: clicking the trigger toggles the content, and
 * Escape inside the content closes it. The real popover is exercised in a
 * real browser instead (see the task's live verification).
 */

const Ctx = createContext<{ open: boolean; setOpen: (open: boolean) => void } | null>(null);

export function Popover({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}

export function PopoverTrigger({ render }: { render: ReactElement }) {
  const ctx = useContext(Ctx);
  if (!ctx || !isValidElement(render)) return null;
  return cloneElement(render as ReactElement<{ onClick?: () => void; "aria-expanded"?: boolean }>, {
    onClick: () => ctx.setOpen(!ctx.open),
    "aria-expanded": ctx.open,
  });
}

export function PopoverContent({ children }: { children: ReactNode; className?: string }) {
  const ctx = useContext(Ctx);
  if (!ctx?.open) return null;
  return (
    <div
      role="dialog"
      aria-label="Filters"
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === "Escape") ctx.setOpen(false);
      }}
    >
      {children}
    </div>
  );
}
