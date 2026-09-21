import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AssignPropertyDialog } from "@/features/buyer-requirements/components/assign-property-dialog";
import type { Property } from "@/features/properties/types";
import type { PropertyInterest } from "@/features/buyer-requirements/types";

const getPropertiesMock = vi.fn();
const createPropertyInterestMock = vi.fn();

vi.mock("@/lib/api/properties", () => ({ getProperties: () => getPropertiesMock() }));
vi.mock("@/lib/api/property-interests", () => ({
  createPropertyInterest: (...args: unknown[]) => createPropertyInterestMock(...args),
}));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

const CONTACT_ID = "c-1";

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: "p-own",
    organization_id: "org-1",
    title: "Casa Propia",
    property_type: "house",
    status: "active",
    price: "4000000.00",
    currency: "MXN",
    address_line: null,
    city: "Monterrey",
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

const OWN = makeProperty();
const EXTERNAL = makeProperty({
  id: "p-ext",
  title: "Casa Externa",
  city: "San Pedro",
  ownership_type: "external",
  external_advisor_name: "Juan Pérez",
});

function makeInterest(propertyId: string): PropertyInterest {
  return {
    id: "i-1",
    organization_id: "org-1",
    contact_id: CONTACT_ID,
    property_id: propertyId,
    status: "new",
    source: null,
    notes: null,
    first_contact_at: null,
    last_contact_at: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
  };
}

function renderDialog(existing: PropertyInterest[] = [], onAssigned = vi.fn()) {
  render(
    <AssignPropertyDialog
      contactId={CONTACT_ID}
      existingInterests={existing}
      onAssigned={onAssigned}
      trigger={<button>Assign property</button>}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: "Assign property" }));
  return onAssigned;
}

describe("AssignPropertyDialog", () => {
  beforeEach(() => {
    getPropertiesMock.mockReset();
    createPropertyInterestMock.mockReset();
    getPropertiesMock.mockResolvedValue({ ok: true, data: [OWN, EXTERNAL] });
  });

  it("does not load anything until it is opened", () => {
    render(<AssignPropertyDialog contactId={CONTACT_ID} existingInterests={[]} trigger={<button>Assign property</button>} />);
    expect(getPropertiesMock).not.toHaveBeenCalled();
  });

  it("lists both the advisor's own and external properties, marking the external one and its advisor", async () => {
    renderDialog();

    expect(await screen.findByText("Casa Propia")).toBeInTheDocument();
    expect(screen.getByText("Casa Externa")).toBeInTheDocument();
    expect(screen.getByText("External")).toBeInTheDocument();
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
  });

  it("filters to only external advisors' properties", async () => {
    renderDialog();
    await screen.findByText("Casa Propia");

    fireEvent.click(screen.getByRole("tab", { name: "External advisors" }));

    expect(screen.queryByText("Casa Propia")).not.toBeInTheDocument();
    expect(screen.getByText("Casa Externa")).toBeInTheDocument();
  });

  it("searches by the other advisor's name too", async () => {
    renderDialog();
    await screen.findByText("Casa Propia");

    fireEvent.change(screen.getByPlaceholderText(/search by title, city or advisor/i), { target: { value: "pérez" } });

    expect(screen.queryByText("Casa Propia")).not.toBeInTheDocument();
    expect(screen.getByText("Casa Externa")).toBeInTheDocument();
  });

  it("assigns a property as 'Proposed to client' by default, using only the contact and property ids", async () => {
    createPropertyInterestMock.mockResolvedValue({ ok: true, data: makeInterest("p-ext") });
    const onAssigned = renderDialog();

    fireEvent.click(await screen.findByRole("button", { name: "Assign Casa Externa" }));

    await waitFor(() =>
      expect(createPropertyInterestMock).toHaveBeenCalledWith(CONTACT_ID, { property_id: "p-ext", status: "new" })
    );
    await waitFor(() => expect(onAssigned).toHaveBeenCalled());
    expect(createPropertyInterestMock.mock.calls[0][1]).not.toHaveProperty("organization_id");
  });

  it("can assign it directly as 'Interested'", async () => {
    createPropertyInterestMock.mockResolvedValue({ ok: true, data: makeInterest("p-own") });
    renderDialog();
    await screen.findByText("Casa Propia");

    fireEvent.change(screen.getByLabelText("Relationship to create"), { target: { value: "interested" } });
    fireEvent.click(screen.getByRole("button", { name: "Assign Casa Propia" }));

    await waitFor(() =>
      expect(createPropertyInterestMock).toHaveBeenCalledWith(CONTACT_ID, { property_id: "p-own", status: "interested" })
    );
  });

  it("does not offer a property that's already assigned to this client", async () => {
    renderDialog([makeInterest("p-own")]);
    await screen.findByText("Casa Propia");

    expect(screen.getByText("Already assigned")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assign Casa Propia" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Assign Casa Externa" })).toBeInTheDocument();
  });

  it("shows a friendly error and stays open if the assignment fails", async () => {
    createPropertyInterestMock.mockResolvedValue({ ok: false, error: { message: "boom", status: 500 } });
    const onAssigned = renderDialog();

    fireEvent.click(await screen.findByRole("button", { name: "Assign Casa Externa" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onAssigned).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("points the advisor to 'Add external property' when there are no external ones yet", async () => {
    getPropertiesMock.mockResolvedValue({ ok: true, data: [OWN] });
    renderDialog();
    await screen.findByText("Casa Propia");

    fireEvent.click(screen.getByRole("tab", { name: "External advisors" }));

    expect(screen.getByText(/add external property/i)).toBeInTheDocument();
  });
});
