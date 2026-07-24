import type { PropertyFilter } from "./parsePropertyQuery";

import {
  parsePropertyQuery,
  mapToDbFilters,
} from "./parsePropertyQuery";

import { searchActiveListings } from "./activeListings";
import { getSoldComps } from "./soldComps";

import {
  formatActiveListings,
  formatSoldComps,
} from "./propertycards";

/**
 * Runs a property search from an already-parsed set of filters.
 *
 * This is useful for multi-turn conversations because the filters can come
 * from the saved user session instead of only from the latest message.
 */
export async function handleParsedPropertySearch(
  parsed: PropertyFilter
): Promise<string> {
  try {
    const dbFilters = mapToDbFilters(parsed);

    console.log("Parsed filters:", parsed);
    console.log("DB filters:", dbFilters);

    if (parsed.intent === "sold") {
      if (!parsed.city) {
        return "Please provide a city for the sold-property search.";
      }

      const soldProperties = await getSoldComps(
        parsed.city,
        parsed.months ?? 12,
        20
      );

      return formatSoldComps(soldProperties);
    }

    const listings = await searchActiveListings(
      dbFilters,
      1,
      10
    );

    if (listings.length === 0) {
      return [
        "I could not find any active listings that match those preferences.",
        "Try increasing the budget, reducing the bedroom requirement,",
        "or changing the property type.",
      ].join(" ");
    }

    return formatActiveListings(listings);
  } catch (error) {
    console.error("Property search failed:", error);

    return "I could not complete the property search because of a processing or database error.";
  }
}

/**
 * Preserves the original single-turn behavior.
 */
export async function handlePropertySearch(
  userQuery: string
): Promise<string> {
  if (!userQuery.trim()) {
    return "Please enter a property search request.";
  }

  const parsed = await parsePropertyQuery(userQuery);

  console.log("User query:", userQuery);

  return handleParsedPropertySearch(parsed);
}
