import type { PropertyListing } from "./types";

function formatValue(
  value: string | number | null | undefined,
  fallback = "unknown"
): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

export function buildListingText(listing: PropertyListing): string {
  const textParts = [
    `Property type: ${formatValue(listing.propertyType)}.`,
    `City: ${formatValue(listing.city)}.`,
    `Bedrooms: ${formatValue(listing.bedrooms)}.`,
    `Half bathrooms: ${formatValue(listing.halfBathrooms)}.`,
    `Lot size: ${formatValue(listing.lotSizeSquareFeet)} square feet.`,
    `Year built: ${formatValue(listing.yearBuilt)}.`,
    `Price: $${formatValue(listing.price)}.`,
    `Listing description: ${formatValue(
      listing.remarks,
      "No listing description available"
    )}.`,
  ];

  return textParts
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}