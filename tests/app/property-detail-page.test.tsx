import { Suspense, act } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PropertyDetailPage from "@/app/(dashboard)/properties/[id]/page";
import type { Property } from "@/features/properties/types";

const getPropertyMock = vi.fn();

vi.mock("@/lib/api/properties", () => ({
  getProperty: (id: string) => getPropertyMock(id),
}));

const REAL_PROPERTY_ID = "dc525277-4c97-5441-90ca-48c9734745cf";

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: REAL_PROPERTY_ID,
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
    created_at: "2026-08-21T20:33:33Z",
    updated_at: "2026-08-21T20:33:33Z",
    features: [{ feature_key: "pool" }],
    ...overrides,
  };
}

// Same act() wrapping as tests/app/lead-detail-page.test.tsx — see that
// file's comment for why a Client Component page reading `params` via
// React's `use()` needs this even for an already-resolved promise.
async function renderPage(id: string) {
  let utils!: ReturnType<typeof render>;
  await act(async () => {
    utils = render(
      <Suspense fallback={<div>page-loading</div>}>
        <PropertyDetailPage params={Promise.resolve({ id })} />
      </Suspense>
    );
  });
  return utils;
}

describe("PropertyDetailPage", () => {
  it("loads and displays the real property for the id in the URL", async () => {
    getPropertyMock.mockResolvedValue({ ok: true, data: makeProperty() });

    await renderPage(REAL_PROPERTY_ID);

    expect(await screen.findByRole("heading", { name: "Departamento Del Valle" })).toBeInTheDocument();
    expect(screen.getByText(/3,400,000/)).toBeInTheDocument();
    expect(screen.getByText("pool")).toBeInTheDocument();
    expect(getPropertyMock).toHaveBeenCalledWith(REAL_PROPERTY_ID);
  });

  it("shows a not-found state without crashing when the property doesn't exist", async () => {
    getPropertyMock.mockResolvedValue({ ok: false, error: { message: "irrelevant", status: 404 } });

    await renderPage("00000000-0000-0000-0000-000000000000");

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't be found/i);
  });

  it("never fabricates a feature when there are none", async () => {
    getPropertyMock.mockResolvedValue({ ok: true, data: makeProperty({ features: [] }) });

    await renderPage(REAL_PROPERTY_ID);

    await screen.findByRole("heading", { name: "Departamento Del Valle" });
    expect(screen.queryByText("pool")).not.toBeInTheDocument();
  });
});
