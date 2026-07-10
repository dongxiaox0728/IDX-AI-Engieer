import type { ListingRow } from "./property";
import type { SoldCompRow } from "./soldComps";

function formatCurrency(value: number | null): string {
  if (value === null) {
    return "Price unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number | null): string {
  if (value === null) {
    return "N/A";
  }

  return value.toLocaleString("en-US");
}

export function formatActiveListings(
  listings: ListingRow[]
): string {
  if (listings.length === 0) {
    return "I could not find any active listings matching those filters.";
  }

  const cards = listings.map((listing, index) => {
    const agentName = [
      listing.agentFirstName,
      listing.agentLastName,
    ]
      .filter(Boolean)
      .join(" ");

    return [
      `${index + 1}. ${listing.address ?? "Address unavailable"}`,
      `${listing.city ?? ""} ${listing.zip ?? ""}`.trim(),
      formatCurrency(listing.price),
      `${listing.beds ?? "N/A"} beds · ${listing.baths ?? "N/A"} baths · ${formatNumber(listing.sqft)} sq. ft.`,
      listing.propertyType ?? "Property type unavailable",
      agentName ? `Listed by ${agentName}` : "",
      listing.officeName
        ? `Office: ${listing.officeName}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    `I found ${listings.length} matching active listings:`,
    "",
    cards.join("\n\n"),
  ].join("\n");
}

export function formatSoldComps(
  properties: SoldCompRow[]
): string {
  if (properties.length === 0) {
    return "I could not find any recently sold properties matching that request.";
  }

  const cards = properties.map((property, index) => {
    return [
      `${index + 1}. ${property.address ?? "Address unavailable"}`,
      property.city ?? "",
      `Sold for ${formatCurrency(property.closePrice)}`,
      `${property.beds ?? "N/A"} beds · ${property.baths ?? "N/A"} baths · ${formatNumber(property.sqft)} sq. ft.`,
      property.closeDate
        ? `Closed: ${new Date(property.closeDate).toLocaleDateString("en-US")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    `I found ${properties.length} recently sold properties:`,
    "",
    cards.join("\n\n"),
  ].join("\n");
}