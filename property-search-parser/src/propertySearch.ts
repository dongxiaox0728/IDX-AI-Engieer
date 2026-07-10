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

export async function handlePropertySearch(
  userQuery: string
): Promise<string> {
  if (!userQuery.trim()) {
    return "Please enter a property search request.";
  }

  try {
    const parsed = await parsePropertyQuery(userQuery);
    const dbFilters = mapToDbFilters(parsed);

    console.log("User query:", userQuery);
    console.log("Parsed:", parsed);
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

    return formatActiveListings(listings);
  } catch (error) {
    console.error("Property search failed:", error);

    return "I could not complete the property search because of a processing or database error.";
  }
}