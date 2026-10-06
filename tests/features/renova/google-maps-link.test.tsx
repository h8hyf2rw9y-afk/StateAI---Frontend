import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GoogleMapsLink } from "@/features/renova/components/google-maps-link";
import { googleMapsUrl, renovaAddressQuery } from "@/features/renova/lib/maps";

const FULL = {
  street_address: "Av. Constitución 123",
  neighborhood: "Centro",
  municipality: "Monterrey",
  postal_code: "64000",
};

describe("renovaAddressQuery / googleMapsUrl", () => {
  it("joins every captured part, with C.P., the state and México", () => {
    expect(renovaAddressQuery(FULL)).toBe("Av. Constitución 123, Centro, Monterrey, C.P. 64000, Nuevo León, México");
  });

  it("skips missing parts and collapses stray whitespace", () => {
    expect(renovaAddressQuery({ street_address: "  Calle Roble   14 ", municipality: "Apodaca", neighborhood: null })).toBe(
      "Calle Roble 14, Apodaca, Nuevo León, México"
    );
  });

  it("needs a street plus at least a colonia, municipio or código postal", () => {
    expect(renovaAddressQuery({ street_address: "Calle Roble 14" })).toBeNull();
    expect(renovaAddressQuery({ neighborhood: "Centro", municipality: "Monterrey" })).toBeNull();
    expect(renovaAddressQuery({ street_address: "Calle Roble 14", postal_code: "64000" })).toBe("Calle Roble 14, C.P. 64000, Nuevo León, México");
  });

  it("builds an encoded Google Maps search URL", () => {
    const url = googleMapsUrl(FULL)!;
    expect(url.startsWith("https://www.google.com/maps/search/?api=1&query=")).toBe(true);
    expect(new URL(url).searchParams.get("query")).toBe("Av. Constitución 123, Centro, Monterrey, C.P. 64000, Nuevo León, México");
    expect(url).not.toContain(" ");
  });

  it("returns null when the address is incomplete", () => {
    expect(googleMapsUrl({ street_address: "" })).toBeNull();
  });
});

describe("GoogleMapsLink", () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("opens Google Maps in a new tab", () => {
    render(<GoogleMapsLink address={FULL} />);
    const link = screen.getByRole("link", { name: /ver en google maps/i });
    expect(link).toHaveAttribute("href", googleMapsUrl(FULL));
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("copies the link for sharing", async () => {
    render(<GoogleMapsLink address={FULL} />);
    fireEvent.click(screen.getByRole("button", { name: /copiar enlace de google maps/i }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(googleMapsUrl(FULL)));
    expect(await screen.findByText("Copiado")).toBeInTheDocument();
  });

  it("explains what's missing while the address is incomplete", () => {
    render(<GoogleMapsLink address={{ street_address: "Calle Roble 14" }} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/escribe calle y número/i)).toBeInTheDocument();
  });

  it("renders nothing in read-only views when incomplete", () => {
    const { container } = render(<GoogleMapsLink address={{}} hideWhenIncomplete />);
    expect(container).toBeEmptyDOMElement();
  });
});
