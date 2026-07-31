import { RowDataPacket } from "mysql2/promise";
import { query } from "./mysql";
import {
  buildMarketFilter,
  MARKET_VALUE_RULES,
  MarketFilter,
} from "./marketFilters";

export interface MarketSummaryMetrics {
  soldCount: number;
  averageClosePrice: number | null;
  medianClosePrice: number | null;
  averagePricePerSqft: number | null;
  averageDaysOnMarket: number | null;
  averageListToCloseRatio: number | null;
}

export interface MarketSummaryResult {
  status: "success";
  intent: "market_summary";
  city: string;
  period: {
    months: number;
    startDate: string;
    endDate: string;
  };
  metrics: MarketSummaryMetrics;
  recordsUsed: {
    sales: number;
    closePrice: number;
    pricePerSqft: number;
    daysOnMarket: number;
    listToCloseRatio: number;
  };
}

interface AggregateRow extends RowDataPacket {
  sold_count: number | string;
  close_price_count: number | string;
  average_close_price: number | string | null;
  price_per_sqft_count: number | string;
  average_price_per_sqft: number | string | null;
  days_on_market_count: number | string;
  average_days_on_market: number | string | null;
  list_to_close_count: number | string;
  average_list_to_close_ratio: number | string | null;
}

interface ClosePriceRow extends RowDataPacket {
  close_price: number | string;
}

type QueryFunction = <T>(
  sql: string,
  params?: any[]
) => Promise<T[]>;

export interface MarketSummaryDependencies {
  queryFn?: QueryFunction;
  buildFilterFn?: (city: string) => Promise<MarketFilter>;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number | null, decimals = 2): number | null {
  if (value === null) {
    return null;
  }

  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function calculateMedian(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Builds a 12-month city market summary using california_sold.
 *
 * Median is calculated in TypeScript because MySQL does not provide a
 * portable MEDIAN aggregate function.
 */
export async function getMarketSummary(
  city: string,
  dependencies: MarketSummaryDependencies = {}
): Promise<MarketSummaryResult> {
  const queryFn = dependencies.queryFn ?? query;
  const buildFilterFn = dependencies.buildFilterFn ?? buildMarketFilter;
  const filter = await buildFilterFn(city);

  const aggregateSql = `
    SELECT
      COUNT(*) AS sold_count,

      SUM(CASE
        WHEN ${MARKET_VALUE_RULES.validClosePrice}
        THEN 1 ELSE 0
      END) AS close_price_count,

      AVG(CASE
        WHEN ${MARKET_VALUE_RULES.validClosePrice}
        THEN ClosePrice
      END) AS average_close_price,

      SUM(CASE
        WHEN ${MARKET_VALUE_RULES.validClosePrice}
          AND ${MARKET_VALUE_RULES.validLivingArea}
        THEN 1 ELSE 0
      END) AS price_per_sqft_count,

      AVG(CASE
        WHEN ${MARKET_VALUE_RULES.validClosePrice}
          AND ${MARKET_VALUE_RULES.validLivingArea}
        THEN ClosePrice / LivingArea
      END) AS average_price_per_sqft,

      SUM(CASE
        WHEN ${MARKET_VALUE_RULES.validDaysOnMarket}
        THEN 1 ELSE 0
      END) AS days_on_market_count,

      AVG(CASE
        WHEN ${MARKET_VALUE_RULES.validDaysOnMarket}
        THEN DaysOnMarket
      END) AS average_days_on_market,

      SUM(CASE
        WHEN ${MARKET_VALUE_RULES.validClosePrice}
          AND ${MARKET_VALUE_RULES.validListPrice}
        THEN 1 ELSE 0
      END) AS list_to_close_count,

      AVG(CASE
        WHEN ${MARKET_VALUE_RULES.validClosePrice}
          AND ${MARKET_VALUE_RULES.validListPrice}
        THEN (ClosePrice / ListPrice) * 100
      END) AS average_list_to_close_ratio

    FROM california_sold
    WHERE ${filter.whereClause}
  `;

  const closePriceSql = `
    SELECT ClosePrice AS close_price
    FROM california_sold
    WHERE ${filter.whereClause}
      AND ${MARKET_VALUE_RULES.validClosePrice}
  `;

  const [aggregateRows, closePriceRows] = await Promise.all([
    queryFn<AggregateRow>(aggregateSql, filter.params as any[]),
    queryFn<ClosePriceRow>(closePriceSql, filter.params as any[]),
  ]);

  const aggregate = aggregateRows[0];

  if (!aggregate) {
    throw new Error("The market summary query returned no result row.");
  }

  const soldCount = toNumber(aggregate.sold_count) ?? 0;

  if (soldCount === 0) {
    throw new Error(
      `No valid sold-property records were found for ${filter.normalizedCity} during the latest 12-month period.`
    );
  }

  const closePrices = closePriceRows
    .map((row) => toNumber(row.close_price))
    .filter((value): value is number => value !== null && value > 0);

  return {
    status: "success",
    intent: "market_summary",
    city: filter.normalizedCity,
    period: {
      months: filter.period.months,
      startDate: filter.period.startDate,
      endDate: filter.period.endDate,
    },
    metrics: {
      soldCount,
      averageClosePrice: round(toNumber(aggregate.average_close_price), 2),
      medianClosePrice: round(calculateMedian(closePrices), 2),
      averagePricePerSqft: round(
        toNumber(aggregate.average_price_per_sqft),
        2
      ),
      averageDaysOnMarket: round(
        toNumber(aggregate.average_days_on_market),
        1
      ),
      averageListToCloseRatio: round(
        toNumber(aggregate.average_list_to_close_ratio),
        1
      ),
    },
    recordsUsed: {
      sales: soldCount,
      closePrice: toNumber(aggregate.close_price_count) ?? 0,
      pricePerSqft: toNumber(aggregate.price_per_sqft_count) ?? 0,
      daysOnMarket: toNumber(aggregate.days_on_market_count) ?? 0,
      listToCloseRatio: toNumber(aggregate.list_to_close_count) ?? 0,
    },
  };
}
