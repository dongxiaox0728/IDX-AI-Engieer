import { RowDataPacket } from "mysql2/promise";
import { query } from "./mysql";
import {
  buildMarketFilter,
  MARKET_VALUE_RULES,
  MarketFilter,
} from "./marketFilters";
import { calculateMedian } from "./marketSummary";

export type MarketMetricName =
  | "sold_count"
  | "average_close_price"
  | "median_close_price"
  | "average_price_per_sqft"
  | "average_days_on_market"
  | "average_list_to_close_ratio";

export type MarketMetricUnit =
  | "properties"
  | "USD"
  | "USD_per_sqft"
  | "days"
  | "percent";

export interface MarketMetricResult {
  status: "success";
  intent: "market_metric";
  city: string;
  period: {
    months: number;
    startDate: string;
    endDate: string;
  };
  metric: {
    name: MarketMetricName;
    value: number;
    unit: MarketMetricUnit;
  };
  recordCount: number;
}

interface MetricRow extends RowDataPacket {
  metric_value: number | string | null;
  record_count: number | string;
}

interface ClosePriceRow extends RowDataPacket {
  close_price: number | string;
}

type QueryFunction = <T>(
  sql: string,
  params?: any[]
) => Promise<T[]>;

export interface MarketMetricDependencies {
  queryFn?: QueryFunction;
  buildFilterFn?: (city: string) => Promise<MarketFilter>;
}

interface MetricDefinition {
  unit: MarketMetricUnit;
  expression: string;
  validityRule?: string;
  decimals: number;
}

const METRIC_DEFINITIONS: Record<
  Exclude<MarketMetricName, "median_close_price">,
  MetricDefinition
> = {
  sold_count: {
    unit: "properties",
    expression: "COUNT(*)",
    decimals: 0,
  },
  average_close_price: {
    unit: "USD",
    expression: "AVG(ClosePrice)",
    validityRule: MARKET_VALUE_RULES.validClosePrice,
    decimals: 2,
  },
  average_price_per_sqft: {
    unit: "USD_per_sqft",
    expression: "AVG(ClosePrice / LivingArea)",
    validityRule: `${MARKET_VALUE_RULES.validClosePrice}
      AND ${MARKET_VALUE_RULES.validLivingArea}`,
    decimals: 2,
  },
  average_days_on_market: {
    unit: "days",
    expression: "AVG(DaysOnMarket)",
    validityRule: MARKET_VALUE_RULES.validDaysOnMarket,
    decimals: 1,
  },
  average_list_to_close_ratio: {
    unit: "percent",
    expression: "AVG((ClosePrice / ListPrice) * 100)",
    validityRule: `${MARKET_VALUE_RULES.validClosePrice}
      AND ${MARKET_VALUE_RULES.validListPrice}`,
    decimals: 1,
  },
};

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getMetricUnit(metric: MarketMetricName): MarketMetricUnit {
  if (metric === "median_close_price") {
    return "USD";
  }

  return METRIC_DEFINITIONS[metric].unit;
}

/**
 * Returns one requested market metric for a city over the latest
 * valid 12-month period.
 *
 * Metric names come from a fixed whitelist, so user input is never
 * inserted directly into SQL.
 */
export async function getMarketMetric(
  city: string,
  metric: MarketMetricName,
  dependencies: MarketMetricDependencies = {}
): Promise<MarketMetricResult> {
  const queryFn = dependencies.queryFn ?? query;
  const buildFilterFn = dependencies.buildFilterFn ?? buildMarketFilter;
  const filter = await buildFilterFn(city);

  if (metric === "median_close_price") {
    const sql = `
      SELECT ClosePrice AS close_price
      FROM california_sold
      WHERE ${filter.whereClause}
        AND ${MARKET_VALUE_RULES.validClosePrice}
    `;

    const rows = await queryFn<ClosePriceRow>(
      sql,
      filter.params as any[]
    );

    const values = rows
      .map((row) => toNumber(row.close_price))
      .filter((value): value is number => value !== null && value > 0);

    const median = calculateMedian(values);

    if (median === null) {
      throw new Error(
        `No valid values were found for median_close_price in ${filter.normalizedCity} during the latest 12-month period.`
      );
    }

    return {
      status: "success",
      intent: "market_metric",
      city: filter.normalizedCity,
      period: {
        months: filter.period.months,
        startDate: filter.period.startDate,
        endDate: filter.period.endDate,
      },
      metric: {
        name: metric,
        value: round(median, 2),
        unit: getMetricUnit(metric),
      },
      recordCount: values.length,
    };
  }

  const definition = METRIC_DEFINITIONS[metric];
  const metricCondition = definition.validityRule
    ? `AND ${definition.validityRule}`
    : "";

  const sql = `
    SELECT
      ${definition.expression} AS metric_value,
      COUNT(*) AS record_count
    FROM california_sold
    WHERE ${filter.whereClause}
      ${metricCondition}
  `;

  const rows = await queryFn<MetricRow>(
    sql,
    filter.params as any[]
  );

  const row = rows[0];
  const value = toNumber(row?.metric_value);
  const recordCount = toNumber(row?.record_count) ?? 0;

  if (value === null || recordCount === 0) {
    throw new Error(
      `No valid values were found for ${metric} in ${filter.normalizedCity} during the latest 12-month period.`
    );
  }

  return {
    status: "success",
    intent: "market_metric",
    city: filter.normalizedCity,
    period: {
      months: filter.period.months,
      startDate: filter.period.startDate,
      endDate: filter.period.endDate,
    },
    metric: {
      name: metric,
      value: round(value, definition.decimals),
      unit: definition.unit,
    },
    recordCount,
  };
}
