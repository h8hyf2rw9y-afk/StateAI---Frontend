import { Children, createContext, isValidElement, useContext, useEffect, useState, type ReactNode } from "react";

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
 */

interface SelectCtx {
  value: string | undefined;
  onValueChange: ((value: string | null) => void) | undefined;
  items: { value: string; label: ReactNode }[];
  registerItems: (items: { value: string; label: ReactNode }[]) => void;
}

const Ctx = createContext<SelectCtx | null>(null);

export function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  onValueChange?: (value: string | null) => void;
  children: ReactNode;
}) {
  const [items, setItems] = useState<{ value: string; label: ReactNode }[]>([]);
  return <Ctx.Provider value={{ value, onValueChange, items, registerItems: setItems }}>{children}</Ctx.Provider>;
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

export function SelectContent({ children }: { children: ReactNode }) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("SelectContent must be used inside <Select>");

  useEffect(() => {
    const items = Children.toArray(children)
      .filter(isValidElement)
      .map((child) => {
        const props = child.props as { value: string; children: ReactNode };
        return { value: props.value, label: props.children };
      });
    ctx.registerItems(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  return null;
}

export function SelectItem({ children }: { value: string; children: ReactNode }) {
  // Never rendered directly — SelectContent reads `value`/`children` off
  // the element's own props before this ever runs. Present only so JSX
  // referencing <SelectItem> type-checks and doesn't throw if ever called.
  return <>{children}</>;
}

export function SelectGroup({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
