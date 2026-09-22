import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PropertyInterestRow } from "@/features/buyer-requirements/components/property-interest-row";
import type { Property } from "@/features/properties/types";
import type { PropertyInterest } from "@/features/buyer-requirements/types";

const getPropertyMock = vi.fn();
const updatePropertyInterestMock = vi.fn();
const deletePropertyInterestMock = vi.fn();

vi.mock("@/lib/api/properties", () => ({ getProperty: (id: string) => getPropertyMock(id) }));
vi.mock("@/lib/api/property-interests", () => ({
  updatePropertyInterest: (...args: unknown[]) => updatePropertyInterestMock(...args),
  deletePropertyInterest: (...args: unknown[]) => deletePropertyInterestMock(...args),
}));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: "p-1",
    organization_id: "org-1",
    title: "Casa XYZ",
    property_type: "house",
    status: "active",
    price: "5200000.00",
    currency: "MXN",
    address_line: null,
    city: "San Pedro",
    state: null,
    postal_code: null,
    neighborhood: null,
    latitude: null,
    longitude: null,
    construction_m2: null,
    land_m2: null,
    bedrooms: null,
    bathrooms: null,
    parking_spaces: null,
    description: null,
    ownership_type: "own",
    external_source: null,
    external_advisor_name: null,
    external_advisor_contact: null,
    collaboration_status: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    features: [],
    ...overrides,
  };
}

function makeInterest(overrides: Partial<PropertyInterest> = {}): PropertyInterest {
  return {
    id: "i-1",
    organization_id: "org-1",
    contact_id: "c-1",
    property_id: "p-1",
    status: "new",
    source: null,
    notes: null,
    first_contact_at: null,
    last_contact_at: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

describe("PropertyInterestRow", () => {
  beforeEach(() => {
    getPropertyMock.mockReset();
    updatePropertyInterestMock.mockReset();
    deletePropertyInterestMock.mockReset();
    getPropertyMock.mockResolvedValue({ ok: true, data: makeProperty() });
  });

  it("links to the real property and shows the status read-only when no handlers are given", async () => {
    render(<PropertyInterestRow interest={makeInterest({ status: "interested" })} />);

    expect(await screen.findByRole("link", { name: "Casa XYZ" })).toHaveAttribute("href", "/properties/p-1");
    expect(screen.getByText("Interested")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove property/i })).not.toBeInTheDocument();
  });

  it("marks an external property and shows which advisor passed it and how far the collaboration is", async () => {
    getPropertyMock.mockResolvedValue({
      ok: true,
      data: makeProperty({
        ownership_type: "external",
        external_advisor_name: "Juan Pérez",
        collaboration_status: "shared_with_client",
      }),
    });

    render(<PropertyInterestRow interest={makeInterest()} />);

    expect(await screen.findByText("External")).toBeInTheDocument();
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("Shared with client")).toBeInTheDocument();
  });

  it("does not show an External badge on an owned property", async () => {
    render(<PropertyInterestRow interest={makeInterest()} />);
    await screen.findByRole("link", { name: "Casa XYZ" });
    expect(screen.queryByText("External")).not.toBeInTheDocument();
  });

  it("changes the relationship status through the API and reports the updated row", async () => {
    const updated = makeInterest({ status: "viewing_scheduled" });
    updatePropertyInterestMock.mockResolvedValue({ ok: true, data: updated });
    const onChanged = vi.fn();

    render(<PropertyInterestRow interest={makeInterest()} onChanged={onChanged} />);
    await screen.findByRole("link", { name: "Casa XYZ" });
    fireEvent.change(screen.getByLabelText("Relationship status"), { target: { value: "viewing_scheduled" } });

    await waitFor(() => expect(updatePropertyInterestMock).toHaveBeenCalledWith("i-1", { status: "viewing_scheduled" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(updated));
  });

  it("clicking Remove does not delete immediately — it asks for confirmation first", async () => {
    const onRemoved = vi.fn();

    render(<PropertyInterestRow interest={makeInterest()} onRemoved={onRemoved} />);
    await screen.findByRole("link", { name: "Casa XYZ" });
    fireEvent.click(screen.getByRole("button", { name: /remove property from this client/i }));

    expect(deletePropertyInterestMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirm removal" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel removal" }));
    expect(deletePropertyInterestMock).not.toHaveBeenCalled();
    expect(onRemoved).not.toHaveBeenCalled();
  });

  it("removes only the relationship after confirming, then reports its id", async () => {
    deletePropertyInterestMock.mockResolvedValue({ ok: true, data: undefined });
    const onRemoved = vi.fn();

    render(<PropertyInterestRow interest={makeInterest()} onRemoved={onRemoved} />);
    await screen.findByRole("link", { name: "Casa XYZ" });
    fireEvent.click(screen.getByRole("button", { name: /remove property from this client/i }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));

    await waitFor(() => expect(deletePropertyInterestMock).toHaveBeenCalledWith("i-1"));
    await waitFor(() => expect(onRemoved).toHaveBeenCalledWith("i-1"));
  });

  it("shows a friendly error and keeps the row when removal is refused (e.g. an agent role)", async () => {
    deletePropertyInterestMock.mockResolvedValue({ ok: false, error: { message: "Forbidden", status: 403 } });
    const onRemoved = vi.fn();

    render(<PropertyInterestRow interest={makeInterest()} onRemoved={onRemoved} />);
    await screen.findByRole("link", { name: "Casa XYZ" });
    fireEvent.click(screen.getByRole("button", { name: /remove property from this client/i }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onRemoved).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Casa XYZ" })).toBeInTheDocument();
    // The control returns to its closed state so the person can retry.
    await waitFor(() => expect(screen.queryByRole("button", { name: "Confirm removal" })).not.toBeInTheDocument());
  });
});
