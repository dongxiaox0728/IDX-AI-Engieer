import { RowDataPacket } from "mysql2/promise";
import { query } from "./mysql";

interface CityRow extends RowDataPacket {
  city: string | null;
}

let cachedCities: string[] | null = null;

/**
 * Loads distinct, non-empty city names from california_sold.
 *
 * Results are cached in memory so the city list does not need to be
 * reloaded for every question handled by the same process.
 */
export async function getSupportedMarketCities(
  forceRefresh = false
): Promise<string[]> {
  if (cachedCities && !forceRefresh) {
    return [...cachedCities];
  }

  const sql = `
    SELECT DISTINCT TRIM(City) AS city
    FROM california_sold
    WHERE City IS NOT NULL
      AND TRIM(City) <> ''
    ORDER BY city
  `;

  const rows = await query<CityRow>(sql);

  const uniqueCities = new Map<string, string>();

  for (const row of rows) {
    const city = row.city?.trim();

    if (!city) {
      continue;
    }

    const normalizedKey = city.toLocaleLowerCase("en-US");

    if (!uniqueCities.has(normalizedKey)) {
      uniqueCities.set(normalizedKey, city);
    }
  }

  cachedCities = [...uniqueCities.values()].sort((a, b) =>
    a.localeCompare(b, "en-US", { sensitivity: "base" })
  );

  return [...cachedCities];
}

/**
 * Clears the in-memory city cache.
 * Useful after importing or updating california_sold.
 */
export function clearMarketCityCache(): void {
  cachedCities = null;
}
