import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PropertyForm } from "@/features/properties/components/property-form";
import type { Property } from "@/features/properties/types";

const createPropertyMock = vi.fn();
const updatePropertyMock = vi.fn();
const pushMock = vi.fn();

vi.mock("@/lib/api/properties", () => ({
  createProperty: (...args: unknown[]) => createPropertyMock(...args),
  updateProperty: (...args: unknown[]) => updatePropertyMock(...args),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/components/ui/select", () => import("@/tests/test-utils/select-stub"));

const PROPERTY_ID = "dc525277-4c97-5441-90ca-48c9734745cf";

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: PROPERTY_ID,
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
    description: "Departamento moderno.",
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

describe("PropertyForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the trigger closed by default", () => {
    render(<PropertyForm trigger={<button>Add property</button>} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens pre-filled and titled for edit when given an existing property", () => {
    render(<PropertyForm property={makeProperty()} trigger={<button>Edit</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("heading", { name: "Edit property" })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue("Departamento Del Valle");
    expect(screen.getByLabelText(/price/i)).toHaveValue(3400000);
  });

  it("requires a title before submitting", () => {
    render(<PropertyForm trigger={<button>Add property</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Add property" }));
    expect(screen.getByLabelText(/title/i)).toBeRequired();
  });

  it("creates a property with Decimal fields sent as plain numbers, and redirects to its detail page", async () => {
    createPropertyMock.mockResolvedValue({ ok: true, data: makeProperty() });

    render(<PropertyForm trigger={<button>Add property</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Add property" }));

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Casa Nueva" } });
    fireEvent.change(screen.getByLabelText(/price/i), { target: { value: "2500000" } });
    fireEvent.change(screen.getByLabelText(/bedrooms/i), { target: { value: "3" } });

    fireEvent.click(screen.getByRole("button", { name: "Add property" }));

    await waitFor(() => expect(createPropertyMock).toHaveBeenCalled());
    const payload = createPropertyMock.mock.calls[0][0];
    expect(payload.title).toBe("Casa Nueva");
    expect(payload.price).toBe(2500000);
    expect(typeof payload.price).toBe("number");
    expect(payload.bedrooms).toBe(3);
    expect(payload.organization_id).toBeUndefined();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(`/properties/${PROPERTY_ID}`));
  });

  it("updates an existing property and does not redirect", async () => {
    const property = makeProperty();
    updatePropertyMock.mockResolvedValue({ ok: true, data: { ...property, title: "Renamed" } });
    const onSaved = vi.fn();

    render(<PropertyForm property={property} onSaved={onSaved} trigger={<button>Edit</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(updatePropertyMock).toHaveBeenCalledWith(PROPERTY_ID, expect.objectContaining({ title: "Renamed" }))
    );
    expect(pushMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("shows a friendly error message on API failure and does not close", async () => {
    createPropertyMock.mockResolvedValue({ ok: false, error: { message: "irrelevant", status: 500 } });

    render(<PropertyForm trigger={<button>Add property</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Add property" }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Casa" } });
    fireEvent.click(screen.getByRole("button", { name: "Add property" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/something went wrong/i);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows a session-expired message on an authentication failure", async () => {
    createPropertyMock.mockResolvedValue({ ok: false, error: { message: "Not authenticated.", status: 401 } });

    render(<PropertyForm trigger={<button>Add property</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Add property" }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Casa" } });
    fireEvent.click(screen.getByRole("button", { name: "Add property" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/session has expired/i);
  });

  it("defaults to 'My inventory' with no collaboration fields shown", () => {
    render(<PropertyForm trigger={<button>Add property</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Add property" }));

    expect(screen.getByLabelText(/ownership/i)).toHaveValue("own");
    expect(screen.queryByLabelText(/advisor name/i)).not.toBeInTheDocument();
  });

  it("reveals collaboration fields when ownership is switched to External, and sends them on create", async () => {
    createPropertyMock.mockResolvedValue({ ok: true, data: makeProperty({ ownership_type: "external" }) });

    render(<PropertyForm trigger={<button>Add property</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Add property" }));

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Casa XYZ" } });
    fireEvent.change(screen.getByLabelText(/ownership/i), { target: { value: "external" } });

    expect(screen.getByLabelText(/advisor name/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^source/i), { target: { value: "Inmuebles24" } });
    fireEvent.change(screen.getByLabelText(/advisor name/i), { target: { value: "Juan Pérez" } });
    fireEvent.change(screen.getByLabelText(/advisor contact/i), { target: { value: "+52 81 1234 5678" } });

    fireEvent.click(screen.getByRole("button", { name: "Add property" }));

    await waitFor(() => expect(createPropertyMock).toHaveBeenCalled());
    const payload = createPropertyMock.mock.calls[0][0];
    expect(payload.ownership_type).toBe("external");
    expect(payload.external_source).toBe("Inmuebles24");
    expect(payload.external_advisor_name).toBe("Juan Pérez");
    expect(payload.external_advisor_contact).toBe("+52 81 1234 5678");
    expect(payload.collaboration_status).toBeTruthy();
  });

  it("omits collaboration fields entirely when ownership stays 'own'", async () => {
    createPropertyMock.mockResolvedValue({ ok: true, data: makeProperty() });

    render(<PropertyForm trigger={<button>Add property</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Add property" }));
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Casa Normal" } });
    fireEvent.click(screen.getByRole("button", { name: "Add property" }));

    await waitFor(() => expect(createPropertyMock).toHaveBeenCalled());
    const payload = createPropertyMock.mock.calls[0][0];
    expect(payload.ownership_type).toBe("own");
    expect(payload.external_source).toBeUndefined();
    expect(payload.collaboration_status).toBeUndefined();
  });

  it("editing an external property pre-fills its collaboration details", () => {
    const property = makeProperty({
      ownership_type: "external",
      external_source: "Inmuebles24",
      external_advisor_name: "Juan Pérez",
      collaboration_status: "info_received",
    });
    render(<PropertyForm property={property} trigger={<button>Edit</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByLabelText(/ownership/i)).toHaveValue("external");
    expect(screen.getByLabelText(/^source/i)).toHaveValue("Inmuebles24");
    expect(screen.getByLabelText(/advisor name/i)).toHaveValue("Juan Pérez");
  });
});
