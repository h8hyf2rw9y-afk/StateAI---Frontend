import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { GooeyNav } from "@/components/ui/gooey-nav";

vi.mock("next/navigation", () => ({ usePathname: () => "/leads" }));

describe("GooeyNav — controlled (button) mode", () => {
  it("renders every item as a button and marks the controlled value active", () => {
    render(<GooeyNav aria-label="Views" items={["Todos", "Activos", "Renova"]} value={1} onChange={vi.fn()} />);

    expect(screen.getByRole("navigation", { name: "Views" })).toBeInTheDocument();
    for (const label of ["Todos", "Activos", "Renova"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Activos" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Todos" })).not.toHaveAttribute("aria-current");
  });

  it("calls onChange with the clicked index and does not change on its own when controlled", () => {
    const onChange = vi.fn();
    render(<GooeyNav aria-label="Views" items={["Todos", "Activos", "Renova"]} value={0} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Renova" }));

    expect(onChange).toHaveBeenCalledWith(2);
    // Still 0 — the parent didn't re-render with a new `value`.
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-current", "true");
  });

  it("uncontrolled: clicking updates its own active item and still calls onChange", () => {
    const onChange = vi.fn();
    render(<GooeyNav aria-label="Views" items={["Todos", "Activos"]} defaultValue={0} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Activos" }));

    expect(onChange).toHaveBeenCalledWith(1);
    expect(screen.getByRole("button", { name: "Activos" })).toHaveAttribute("aria-current", "true");
  });

  it("accepts rich items with an href, rendered as real links", () => {
    render(
      <GooeyNav
        aria-label="Views"
        items={[
          { label: "Todos", href: "/leads?view=all" },
          { label: "Renova", href: "/leads?view=renova" },
        ]}
        value={0}
      />
    );

    expect(screen.getByRole("link", { name: "Todos" })).toHaveAttribute("href", "/leads?view=all");
    expect(screen.getByRole("link", { name: "Renova" })).toHaveAttribute("href", "/leads?view=renova");
    expect(screen.getByRole("link", { name: "Todos" })).toHaveAttribute("aria-current", "page");
  });
});
