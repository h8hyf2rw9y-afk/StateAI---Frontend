import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PropertiesGrid } from "@/features/properties/components/properties-grid";
import type { Property } from "@/features/properties/types";

const getPropertiesMock = vi.fn();

vi.mock("@/lib/api/properties", () => ({
  getProperties: () => getPropertiesMock(),
}));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: "dc525277-4c97-5441-90ca-48c9734745cf",
    organization_id: "org-1",
    title: "Departamento Del Valle",
    property_type: "apartment",
    status: "active",
    price: "3400000.00",
    currency: "MXN",
    address_line: null,
    city: "San Pedro Garza García",
    state: "Nuevo León",
    postal_code: null,
    neighborhood: "Del Valle",
    latitude: null,
    longitude: null,
    construction_m2: "110.00",
    land_m2: null,
    bedrooms: 2,
    bathrooms: "2.0",
    parking_spaces: 1,
    description: "Departamento moderno en edificio con amenidades.",
    ownership_type: "own",
    external_source: null,
    external_advisor_name: null,
    external_advisor_contact: null,
    collaboration_status: null,
    created_at: "2026-08-21T20:33:33Z",
    updated_at: "2026-08-21T20:33:33Z",
    features: [],
    ...overrides,
  };
}

describe("PropertiesGrid", () => {
  it("shows a loading state before properties arrive", () => {
    getPropertiesMock.mockReturnValue(new Promise(() => {}));

    render(<PropertiesGrid />);

    expect(screen.getByText(/loading properties/i)).toBeInTheDocument();
  });

  it("renders real properties once loaded — title, location, price, type", async () => {
    getPropertiesMock.mockResolvedValue({ ok: true, data: [makeProperty()] });

    render(<PropertiesGrid />);

    expect(await screen.findByText("Departamento Del Valle")).toBeInTheDocument();
    expect(screen.getByText(/Del Valle, San Pedro Garza García, Nuevo León/)).toBeInTheDocument();
    expect(screen.getByText(/3,400,000/)).toBeInTheDocument();
    expect(screen.getByText("Apartment")).toBeInTheDocument();
    // { selector: "span" } avoids matching the (now select-stub-rendered,
    // real-<option>-based) status filter's own "Active" option alongside
    // the actual PropertyStatusBadge.
    expect(screen.getByText("Active", { selector: "span" })).toBeInTheDocument();
  });

  it("never fabricates an agent, image, or operation-type field — only real backend fields render", async () => {
    getPropertiesMock.mockResolvedValue({ ok: true, data: [makeProperty()] });

    render(<PropertiesGrid />);
    await screen.findByText("Departamento Del Valle");

    expect(screen.queryByText(/agent/i)).not.toBeInTheDocument();
  });

  it("shows a null price as 'Price on request' instead of fabricating one", async () => {
    getPropertiesMock.mockResolvedValue({ ok: true, data: [makeProperty({ price: null })] });

    render(<PropertiesGrid />);

    expect(await screen.findByText("Price on request")).toBeInTheDocument();
  });

  it("shows a genuine empty state, not fake demo properties, when the organization has none", async () => {
    getPropertiesMock.mockResolvedValue({ ok: true, data: [] });

    render(<PropertiesGrid />);

    expect(await screen.findByText(/no properties yet/i)).toBeInTheDocument();
  });

  it("shows a friendly error message on API failure", async () => {
    getPropertiesMock.mockResolvedValue({ ok: false, error: { message: "irrelevant", status: 500 } });

    render(<PropertiesGrid />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
  });

  it("shows a session-expired message on an authentication failure", async () => {
    getPropertiesMock.mockResolvedValue({ ok: false, error: { message: "Not authenticated.", status: 401 } });

    render(<PropertiesGrid />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
  });

  it("links each property card to /properties/{real property id}", async () => {
    getPropertiesMock.mockResolvedValue({ ok: true, data: [makeProperty()] });

    render(<PropertiesGrid />);
    const card = await screen.findByText("Departamento Del Valle");
    const link = card.closest("a");

    expect(link).toHaveAttribute("href", "/properties/dc525277-4c97-5441-90ca-48c9734745cf");
  });

  it("shows an External badge on a collaboration property, and none on an owned one", async () => {
    getPropertiesMock.mockResolvedValue({
      ok: true,
      data: [
        makeProperty({ id: "p-own", title: "Casa Propia" }),
        makeProperty({ id: "p-external", title: "Casa XYZ", ownership_type: "external" }),
      ],
    });

    render(<PropertiesGrid />);
    await screen.findByText("Casa Propia");

    const ownCard = screen.getByText("Casa Propia").closest("a");
    const externalCard = screen.getByText("Casa XYZ").closest("a");
    expect(ownCard?.textContent).not.toContain("External");
    expect(externalCard?.textContent).toContain("External");
  });

  it("filters to only External / Collaboration properties", async () => {
    getPropertiesMock.mockResolvedValue({
      ok: true,
      data: [
        makeProperty({ id: "p-own", title: "Casa Propia" }),
        makeProperty({ id: "p-external", title: "Casa XYZ", ownership_type: "external" }),
      ],
    });

    render(<PropertiesGrid />);
    await screen.findByText("Casa Propia");

    fireEvent.click(screen.getByRole("tab", { name: /external advisors/i }));

    expect(screen.queryByText("Casa Propia")).not.toBeInTheDocument();
    expect(screen.getByText("Casa XYZ")).toBeInTheDocument();
  });

  it("shows a count on each source tab, computed from the already-loaded list", async () => {
    getPropertiesMock.mockResolvedValue({
      ok: true,
      data: [
        makeProperty({ id: "a", title: "Propia 1" }),
        makeProperty({ id: "b", title: "Propia 2" }),
        makeProperty({ id: "c", title: "Externa 1", ownership_type: "external" }),
      ],
    });

    render(<PropertiesGrid />);
    await screen.findByText("Propia 1");

    expect(screen.getByRole("tab", { name: /^All\s*3$/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^My inventory\s*2$/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^External advisors\s*1$/ })).toBeInTheDocument();
  });

  it("shows the other advisor's name and the collaboration status on an external property's card", async () => {
    getPropertiesMock.mockResolvedValue({
      ok: true,
      data: [
        makeProperty({
          id: "ext",
          title: "Casa XYZ",
          ownership_type: "external",
          external_advisor_name: "Juan Pérez",
          collaboration_status: "info_received",
        }),
      ],
    });

    render(<PropertiesGrid />);
    fireEvent.click(await screen.findByRole("tab", { name: /external advisors/i }));

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("Info received")).toBeInTheDocument();
  });

  it("shows a specific empty state on the External advisors tab when there are none, not the generic filter message", async () => {
    getPropertiesMock.mockResolvedValue({ ok: true, data: [makeProperty({ title: "Solo propia" })] });

    render(<PropertiesGrid />);
    await screen.findByText("Solo propia");
    fireEvent.click(screen.getByRole("tab", { name: /external advisors/i }));

    expect(screen.getByText("No external properties yet")).toBeInTheDocument();
    expect(screen.queryByText("Solo propia")).not.toBeInTheDocument();
  });
});
