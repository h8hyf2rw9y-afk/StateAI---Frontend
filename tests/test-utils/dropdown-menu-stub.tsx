import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

/**
 * Test-only stand-in for components/ui/dropdown-menu.tsx, used via
 * `vi.mock("@/components/ui/dropdown-menu", () => import("@/tests/test-utils/dropdown-menu-stub"))`
 * in tests that need to render a DropdownMenu's actual content, not just a
 * closed trigger.
 *
 * Same root cause as tests/test-utils/select-stub.tsx (both are built on
 * @base-ui/react): DropdownMenu's real components require Menu.Root/
 * Menu.Group context to even render at all ("MenuRootContext is missing"/
 * "MenuGroupContext is missing" — a hard throw, not just a jsdom
 * positioning hang like Select's), and driving the real popup open via
 * fireEvent in jsdom is exactly the same unsupported interaction this
 * project already worked around for Select. This stub renders the content
 * unconditionally, in plain DOM, with the same public prop contract
 * (`render` as an element to clone onto, matching every other base-ui
 * `render` prop in this app) so a test can assert on real rendered content
 * without simulating popup/positioning behavior that has nothing to do
 * with the component under test's own logic.
 */

export function DropdownMenu({ children }: { children?: ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  return <div data-slot="dropdown-menu-stub">{children}</div>;
}

export function DropdownMenuTrigger({
  render,
  children,
  ...props
}: {
  render?: ReactElement;
  children?: ReactNode;
  [key: string]: unknown;
}) {
  if (render && isValidElement(render)) {
    return cloneElement(render as ReactElement<Record<string, unknown>>, props, children);
  }
  return <button {...props}>{children}</button>;
}

export function DropdownMenuContent({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) {
  return <div {...props}>{children}</div>;
}

export function DropdownMenuItem({
  render,
  children,
  onClick,
  className,
  ...props
}: {
  render?: ReactElement;
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
  [key: string]: unknown;
}) {
  if (render && isValidElement(render)) {
    return cloneElement(render as ReactElement<Record<string, unknown>>, { onClick, className, ...props }, children);
  }
  return (
    <div role="menuitem" onClick={onClick} className={className} {...props}>
      {children}
    </div>
  );
}

export function DropdownMenuSeparator() {
  return <hr />;
}

export function DropdownMenuLabel({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) {
  return <div {...props}>{children}</div>;
}

export function DropdownMenuGroup({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
