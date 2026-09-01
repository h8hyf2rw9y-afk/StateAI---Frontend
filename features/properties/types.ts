export const PROPERTY_TYPES = [
  "house",
  "apartment",
  "condo",
  "land",
  "commercial",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: "House",
  apartment: "Apartment",
  condo: "Condo",
  land: "Land",
  commercial: "Commercial",
};

export const PROPERTY_STATUSES = [
  "available",
  "under_offer",
  "sold",
  "off_market",
] as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  available: "Available",
  under_offer: "Under Offer",
  sold: "Sold",
  off_market: "Off Market",
};

export interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  price: number;
  currency: string;
  type: PropertyType;
  status: PropertyStatus;
  bedrooms: number;
  bathrooms: number;
  areaSqm: number;
  images: string[];
  description: string;
  agentId: string;
  agentName: string;
  createdAt: string; // ISO date
}
