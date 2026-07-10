import type { PropertyFilters } from "./property";

export type SearchIntent = "active" | "sold";

export type PropertyFilter = {
  intent: SearchIntent;
  city: string | null;
  maxPrice: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  type: string | null;
  pool: "True" | null;
  hasView: "True" | null;
  maxHOA: number | null;
  months: number | null;
};

function parsePrice(value: string, suffix?: string): number {
  let numberValue = Number(value.replace(/,/g, ""));

  if (suffix?.toLowerCase() === "k") {
    numberValue *= 1_000;
  }

  if (suffix?.toLowerCase() === "m") {
    numberValue *= 1_000_000;
  }

  return numberValue;
}

function parseIntent(query: string): SearchIntent {
  return /\b(sold|comps?|comparables?|recent sales?)\b/i.test(query)
    ? "sold"
    : "active";
}

function parseMonths(query: string): number | null {
  const monthMatch = query.match(
    /(?:last|past|within|during(?:\s+the)?\s+last)\s+(\d+)\s+months?/i
  );

  if (monthMatch?.[1]) {
    return Number(monthMatch[1]);
  }

  const yearMatch = query.match(
    /(?:last|past|within|during(?:\s+the)?\s+last)\s+(\d+)\s+years?/i
  );

  if (yearMatch?.[1]) {
    return Number(yearMatch[1]) * 12;
  }

  return null;
}

function parseCity(query: string): string | null {
  const cityMatch = query.match(
    /\bin\s+([A-Za-z][A-Za-z .'-]*?)(?=\s+(?:under|below|less than|max|maximum|with|at least|over|above|during|within|for|from|\d+\s*[-]?\s*(?:bed|bath))\b|[,.!?]|$)/i
  );

  return cityMatch?.[1]?.trim() || null;
}

export async function parsePropertyQuery(
  query: string
): Promise<PropertyFilter> {
  const lowerQuery = query.toLowerCase();

  const priceMatch = query.match(
    /(?:under|below|less than|max|maximum)\s*\$?([\d,.]+)\s*(k|m)?/i
  );

  const bedsMatch = query.match(
    /(\d+)\s*[-]?\s*(bed|beds|bedroom|bedrooms)/i
  );

  const bathsMatch = query.match(
    /(\d+(?:\.5)?)\s*[-]?\s*(bath|baths|bathroom|bathrooms)/i
  );

  const sqftMatch = query.match(
    /(\d[\d,]*)\s*(sqft|sq ft|square feet)/i
  );

  const hoaMatch = query.match(
    /(?:hoa|association fee)\s*(?:under|below|less than|max|maximum)?\s*\$?([\d,.]+)/i
  );

  const typeMap: Record<string, string> = {
    condo: "Condominium",
    condos: "Condominium",
    condominium: "Condominium",
    townhome: "Townhouse",
    townhomes: "Townhouse",
    townhouse: "Townhouse",
    townhouses: "Townhouse",
    "single family": "SingleFamilyResidence",
    "single-family": "SingleFamilyResidence",
    house: "SingleFamilyResidence",
    houses: "SingleFamilyResidence",
    home: "SingleFamilyResidence",
    homes: "SingleFamilyResidence",
    land: "UnimprovedLand",
  };

  let type: string | null = null;

  for (const [key, mappedType] of Object.entries(typeMap)) {
    if (lowerQuery.includes(key)) {
      type = mappedType;
      break;
    }
  }

  return {
    intent: parseIntent(query),
    city: parseCity(query),
    maxPrice:
      priceMatch?.[1]
        ? parsePrice(priceMatch[1], priceMatch[2])
        : null,
    beds:
      bedsMatch?.[1]
        ? Number(bedsMatch[1])
        : null,
    baths:
      bathsMatch?.[1]
        ? Number(bathsMatch[1])
        : null,
    sqft:
      sqftMatch?.[1]
        ? Number(sqftMatch[1].replace(/,/g, ""))
        : null,
    type,
    pool: /\bpool\b/i.test(query) ? "True" : null,
    hasView: /\bview\b/i.test(query) ? "True" : null,
    maxHOA:
      hoaMatch?.[1]
        ? Number(hoaMatch[1].replace(/,/g, ""))
        : null,
    months: parseMonths(query),
  };
}

export function mapToDbFilters(
  parsed: PropertyFilter
): PropertyFilters {
  return {
    city: parsed.city ?? undefined,
    maxPrice: parsed.maxPrice ?? undefined,
    beds: parsed.beds ?? undefined,
    baths: parsed.baths ?? undefined,
    sqft: parsed.sqft ?? undefined,
    type: parsed.type ?? undefined,
    pool: parsed.pool ?? undefined,
    hasView: parsed.hasView ?? undefined,
  };
}