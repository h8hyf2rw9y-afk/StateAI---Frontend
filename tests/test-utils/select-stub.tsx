import { Children, createContext, isValidElement, useContext, type ReactNode } from "react";

/**
 * Test-only stand-in for components/ui/select.tsx, used via
 * `vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"))`
 * in tests that need to actually drive a Select (open it, pick an option),
 * not just render one closed.
 *
 * The real component is built on @base-ui/react/select, whose popup is
 * portal-rendered and position-tracked (ResizeObserver/floating-ui) —
 * driving it with fireEvent in jsdom hung indefinitely when first tried
 * here (no existing test in this repo interacts with a real Select; every
 * prior test only renders one closed). This stub preserves the same public
 * prop contract (`Select value/onValueChange`, `SelectTrigger`
 * children/aria-label, `SelectContent` > `SelectItem` value/children) but
 * renders as one plain native `<select>`, so tests can drive it with a
 * simple `fireEvent.change` instead of simulating pointer-driven
 * popup/positioning behavior that has nothing to do with the component
 * under test's own logic.
 *
 * Items are extracted from `<SelectContent>`'s children *synchronously
 * during render* (walking the `children` prop `Select` already has, not
 * via a child component's own `useEffect` reporting back up). An earlier
 * version used a `SelectContent`-owned effect to register items into
 * context — that introduced a real gap between the first commit (options
 * not yet registered) and the effect flushing (options registered), which
 * `fireEvent.change` could race: firing before the target `<option>`
 * existed silently no-ops a native `<select>`'s value assignment, so the
 * simulated pick was lost. That only surfaced as an intermittent failure
 * when the whole suite ran together (more scheduling variance), not when
 * this file ran alone — confirmed and fixed by removing the effect
 * entirely in favor of synchronous extraction.
 */

interface SelectCtx {
  value: string | undefined;
  onValueChange: ((value: string | null) => void) | undefined;
  items: { value: string; label: ReactNode }[];
}

const Ctx = createContext<SelectCtx | null>(null);

/**
 * Walks the whole children tree looking for elements with a `value` prop
 * (a `SelectItem`) — recursing into anything else that has `children`
 * (`SelectContent`, `SelectGroup`, or a plain wrapper `<>...</>`), so this
 * doesn't care which specific grouping component sits between `Select` and
 * its `SelectItem`s.
 */
function extractItems(children: ReactNode): { value: string; label: ReactNode }[] {
  const items: { value: string; label: ReactNode }[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as { children?: ReactNode; value?: string };
    if (typeof props.value === "string") {
      items.push({ value: props.value, label: props.children });
    } else if (props.children !== undefined) {
      items.push(...extractItems(props.children));
    }
  });
  return items;
}

export function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (value: string | null) => void;
  children: ReactNode;
}) {
  const items = extractItems(children);
  return <Ctx.Provider value={{ value, onValueChange, items }}>{children}</Ctx.Provider>;
}

export function SelectTrigger({
  "aria-label": ariaLabel,
}: {
  children?: ReactNode;
  className?: string;
  size?: "sm" | "default";
  "aria-label"?: string;
}) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("SelectTrigger must be used inside <Select>");
  return (
    <select
      aria-label={ariaLabel}
      value={ctx.value ?? ""}
      onChange={(e) => ctx.onValueChange?.(e.target.value || null)}
    >
      <option value="" disabled hidden />
      {ctx.items.map((item) => (
        <option key={item.value} value={item.value}>
          {typeof item.label === "string" ? item.label : item.value}
        </option>
      ))}
    </select>
  );
}

/** Rendered nowhere in this stub (the native <select>'s own selected <option> already shows the current value) — kept as a no-op so callers passing a render-prop child don't crash. */
export function SelectValue() {
  return null;
}

/** Not rendered directly — `Select` reads this element's `children` prop straight off the JSX tree (see extractItems) rather than this component ever mounting its own children. */
export function SelectContent({ children: _children }: { children: ReactNode }) {
  void _children;
  return null;
}

export function SelectItem({ children }: { value: string; children: ReactNode }) {
  // Never rendered directly — extractItems reads `value`/`children` off
  // the element's own props before this ever runs. Present only so JSX
  // referencing <SelectItem> type-checks and doesn't throw if ever called.
  return <>{children}</>;
}

export function SelectGroup({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
