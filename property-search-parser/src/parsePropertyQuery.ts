import type { PropertyFilters } from "./property";

export type SearchIntent = "active" | "sold";

export type PendingField =
  | "city"
  | "maxPrice"
  | "beds"
  | "baths"
  | "sqft"
  | "type"
  | "maxHOA"
  | null;

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

  const normalizedSuffix = suffix?.toLowerCase();

  if (normalizedSuffix === "k" || normalizedSuffix === "thousand") {
    numberValue *= 1_000;
  }

  if (normalizedSuffix === "m" || normalizedSuffix === "million") {
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

function parseCity(
  query: string,
  expectedField: PendingField
): string | null {
  const cityMatch = query.match(
    /\b(?:in|near|around)\s+([A-Za-z][A-Za-z .'-]*?)(?=\s+(?:under|below|less than|max|maximum|budget|with|at least|over|above|during|within|for|from|\d+\s*[-]?\s*(?:bed|bath))\b|[,.!?]|$)/i
  );

  if (cityMatch?.[1]) {
    return cityMatch[1].trim();
  }

  // Handles short follow-up replies such as "Los Angeles" or "Irvine".
  if (expectedField === "city") {
    const cityReply = query
      .trim()
      .replace(/[,.!?]+$/, "")
      .trim();

    if (/^[A-Za-z][A-Za-z .'-]*$/.test(cityReply)) {
      return cityReply;
    }
  }

  return null;
}

function parseMaxPrice(
  query: string,
  expectedField: PendingField
): number | null {
  const explicitPriceMatch = query.match(
    /(?:under|below|less than|up to|max(?:imum)?(?:\s+budget)?(?:\s+of)?|budget(?:\s+is)?(?:\s+under)?)\s*:?\s*\$?\s*([\d,.]+)\s*(k|m|thousand|million)?/i
  );

  if (explicitPriceMatch?.[1]) {
    return parsePrice(explicitPriceMatch[1], explicitPriceMatch[2]);
  }

  // Allows a short follow-up such as "$1.2M" or "1200000".
  if (expectedField === "maxPrice") {
    const shortPriceMatch = query.match(
      /^\s*\$?\s*([\d,.]+)\s*(k|m|thousand|million)?\s*$/i
    );

    if (shortPriceMatch?.[1]) {
      return parsePrice(shortPriceMatch[1], shortPriceMatch[2]);
    }
  }

  return null;
}

function parseNumberReply(
  query: string,
  expectedField: PendingField,
  field: Exclude<PendingField, "city" | "maxPrice" | "type" | "maxHOA" | null>
): number | null {
  if (expectedField !== field) {
    return null;
  }

  const match = query.match(/^\s*(\d+(?:\.\d+)?)\s*$/);
  return match?.[1] ? Number(match[1]) : null;
}

function parsePropertyType(
  query: string,
  expectedField: PendingField
): string | null {
  const lowerQuery = query.toLowerCase();

  const typePatterns: Array<[RegExp, string]> = [
    [/\bcondos?\b|\bcondominiums?\b/i, "Condominium"],
    [/\btown\s*homes?\b|\btownhouses?\b/i, "Townhouse"],
    [/\bsingle[-\s]?family(?:\s+(?:home|house|residence))?\b/i, "SingleFamilyResidence"],
    [/\bhouses?\b/i, "SingleFamilyResidence"],
    [/\bhomes?\b/i, "SingleFamilyResidence"],
    [/\bland\b|\bunimproved land\b/i, "UnimprovedLand"],
  ];

  for (const [pattern, mappedType] of typePatterns) {
    if (pattern.test(lowerQuery)) {
      return mappedType;
    }
  }

  if (expectedField === "type") {
    const trimmed = lowerQuery.trim();

    if (trimmed === "condo" || trimmed === "condominium") {
      return "Condominium";
    }

    if (trimmed === "townhome" || trimmed === "townhouse") {
      return "Townhouse";
    }

    if (
      trimmed === "single family" ||
      trimmed === "single-family" ||
      trimmed === "house" ||
      trimmed === "home"
    ) {
      return "SingleFamilyResidence";
    }

    if (trimmed === "land") {
      return "UnimprovedLand";
    }
  }

  return null;
}

export async function parsePropertyQuery(
  query: string,
  expectedField: PendingField = null
): Promise<PropertyFilter> {
  const bedsMatch = query.match(
    /(?:at least|min(?:imum)?(?:\s+of)?\s*)?(\d+)\s*[-]?\s*(?:bed|beds|bedroom|bedrooms|br)\b/i
  );

  const bathsMatch = query.match(
    /(?:at least|min(?:imum)?(?:\s+of)?\s*)?(\d+(?:\.5)?)\s*[-]?\s*(?:bath|baths|bathroom|bathrooms|ba)\b/i
  );

  const sqftMatch = query.match(
    /(?:at least|min(?:imum)?(?:\s+of)?\s*)?(\d[\d,]*)\s*(?:sqft|sq ft|square feet)\b/i
  );

  const hoaMatch = query.match(
    /(?:hoa|association fee)\s*(?:under|below|less than|max|maximum)?\s*\$?\s*([\d,.]+)/i
  );

  const shortHoaMatch =
    expectedField === "maxHOA"
      ? query.match(/^\s*\$?\s*([\d,.]+)\s*$/)
      : null;

  return {
    intent: parseIntent(query),
    city: parseCity(query, expectedField),
    maxPrice: parseMaxPrice(query, expectedField),
    beds: bedsMatch?.[1]
      ? Number(bedsMatch[1])
      : parseNumberReply(query, expectedField, "beds"),
    baths: bathsMatch?.[1]
      ? Number(bathsMatch[1])
      : parseNumberReply(query, expectedField, "baths"),
    sqft: sqftMatch?.[1]
      ? Number(sqftMatch[1].replace(/,/g, ""))
      : parseNumberReply(query, expectedField, "sqft"),
    type: parsePropertyType(query, expectedField),
    pool:
      /\b(?:with|has|have|need|want|must have)(?:\s+a)?\s+pool\b/i.test(query) ||
      /\bpool\b/i.test(query)
        ? "True"
        : null,
    hasView:
      /\b(?:with|has|have|need|want|must have)(?:\s+a)?\s+view\b/i.test(query) ||
      /\bview\b/i.test(query)
        ? "True"
        : null,
    maxHOA: hoaMatch?.[1]
      ? Number(hoaMatch[1].replace(/,/g, ""))
      : shortHoaMatch?.[1]
        ? Number(shortHoaMatch[1].replace(/,/g, ""))
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
