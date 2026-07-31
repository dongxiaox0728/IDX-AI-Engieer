import { RowDataPacket } from "mysql2/promise";
import { query } from "./mysql";

const CLOSE_DATE_FORMAT = "%Y-%m-%d";
const DEFAULT_PERIOD_MONTHS = 12;

export interface MarketPeriod {
  months: number;
  startDate: string;
  endDate: string;
}

export interface MarketFilter {
  whereClause: string;
  params: unknown[];
  period: MarketPeriod;
  normalizedCity: string;
}

interface MarketPeriodRow extends RowDataPacket {
  start_date: string | null;
  end_date: string | null;
}

/**
 * Normalizes a city supplied by the user.
 *
 * Example:
 * "  San   Diego  " -> "San Diego"
 */
export function normalizeCity(city: string): string {
  const normalized = city.trim().replace(/\s+/g, " ");

  if (!normalized) {
    throw new Error("City is required.");
  }

  return normalized;
}

/**
 * Finds the latest valid, non-future CloseDate in california_sold and
 * returns the 12-month period ending on that date.
 *
 * CloseDate is stored as VARCHAR, so it is converted with STR_TO_DATE().
 */
export async function getDefaultMarketPeriod(): Promise<MarketPeriod> {
  const sql = `
    SELECT
      DATE_FORMAT(
        DATE_SUB(
          MAX(STR_TO_DATE(CloseDate, '${CLOSE_DATE_FORMAT}')),
          INTERVAL ${DEFAULT_PERIOD_MONTHS} MONTH
        ),
        '${CLOSE_DATE_FORMAT}'
      ) AS start_date,
      DATE_FORMAT(
        MAX(STR_TO_DATE(CloseDate, '${CLOSE_DATE_FORMAT}')),
        '${CLOSE_DATE_FORMAT}'
      ) AS end_date
    FROM california_sold
    WHERE STR_TO_DATE(CloseDate, '${CLOSE_DATE_FORMAT}') IS NOT NULL
      AND STR_TO_DATE(CloseDate, '${CLOSE_DATE_FORMAT}') <= CURDATE()
  `;

  const rows = await query<MarketPeriodRow>(sql);
  const row = rows[0];

  if (!row?.start_date || !row?.end_date) {
    throw new Error(
      "Could not determine a valid 12-month market period from california_sold."
    );
  }

  return {
    months: DEFAULT_PERIOD_MONTHS,
    startDate: row.start_date,
    endDate: row.end_date,
  };
}

/**
 * Builds the shared WHERE clause used by city-level market queries.
 *
 * This applies:
 * - normalized city matching,
 * - valid CloseDate conversion,
 * - the latest 12-month period,
 * - exclusion of future dates.
 *
 * Metric-specific rules such as ClosePrice > 0, LivingArea > 0,
 * ListPrice > 0, or DaysOnMarket >= 0 should be added by each
 * analytics query only when that metric requires them.
 *
 * PropertyType is intentionally not filtered here until the actual
 * values in california_sold are confirmed.
 */
export async function buildMarketFilter(city: string): Promise<MarketFilter> {
  const normalizedCity = normalizeCity(city);
  const period = await getDefaultMarketPeriod();

  const whereClause = `
    STR_TO_DATE(CloseDate, '${CLOSE_DATE_FORMAT}') IS NOT NULL
    AND STR_TO_DATE(CloseDate, '${CLOSE_DATE_FORMAT}') BETWEEN ? AND ?
    AND LOWER(TRIM(City)) = LOWER(?)
  `.trim();

  return {
    whereClause,
    params: [period.startDate, period.endDate, normalizedCity],
    period,
    normalizedCity,
  };
}

/**
 * Reusable metric-specific SQL conditions.
 *
 * Example:
 *   const filter = await buildMarketFilter(city);
 *   const sql = `
 *     SELECT AVG(ClosePrice) AS average_close_price
 *     FROM california_sold
 *     WHERE ${filter.whereClause}
 *       AND ${MARKET_VALUE_RULES.validClosePrice}
 *   `;
 */
export const MARKET_VALUE_RULES = {
  validClosePrice: "ClosePrice > 0",
  validListPrice: "ListPrice > 0",
  validLivingArea: "LivingArea > 0",
  validDaysOnMarket: "DaysOnMarket >= 0",
} as const;
