import { RowDataPacket } from "mysql2/promise";
import { query } from "./mysql";
import {
  buildMarketFilter,
  MARKET_VALUE_RULES,
  MarketFilter,
} from "./marketFilters";
import { calculateMedian } from "./marketSummary";

export type MarketTrendMetric =
  | "sold_count"
  | "average_close_price"
  | "median_close_price"
  | "average_days_on_market";

export type TrendDirection =
  | "increasing"
  | "decreasing"
  | "stable"
  | "insufficient_data";

export interface MonthlyTrendPoint {
  month: string;
  value: number;
  recordCount: number;
}

export interface MarketTrendResult {
  status: "success";
  intent: "market_trend";
  city: string;
  period: {
    months: number;
    startDate: string;
    endDate: string;
  };
  metric: {
    name: MarketTrendMetric;
    unit: "properties" | "USD" | "days";
  };
  monthlyData: MonthlyTrendPoint[];
  comparison: {
    firstMonth: string;
    firstMonthValue: number;
    latestMonth: string;
    latestMonthValue: number;
    overallChange: number;
    overallChangePct: number | null;
    previousMonthValue: number | null;
    monthOverMonthChangePct: number | null;
  };
  trendDirection: TrendDirection;
}

interface AggregateTrendRow extends RowDataPacket {
  month: string;
  metric_value: number | string | null;
  record_count: number | string;
}

interface MedianTrendRow extends RowDataPacket {
  month: string;
  close_price: number | string;
}

type QueryFunction = <T>(
  sql: string,
  params?: any[]
) => Promise<T[]>;

export interface MarketTrendDependencies {
  queryFn?: QueryFunction;
  buildFilterFn?: (city: string) => Promise<MarketFilter>;
}

interface TrendMetricDefinition {
  unit: "properties" | "USD" | "days";
  expression: string;
  validityRule?: string;
  decimals: number;
}

const TREND_METRIC_DEFINITIONS: Record<
  Exclude<MarketTrendMetric, "median_close_price">,
  TrendMetricDefinition
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
  average_days_on_market: {
    unit: "days",
    expression: "AVG(DaysOnMarket)",
    validityRule: MARKET_VALUE_RULES.validDaysOnMarket,
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

function percentageChange(
  previousValue: number,
  currentValue: number
): number | null {
  if (previousValue === 0) {
    return null;
  }

  return ((currentValue - previousValue) / previousValue) * 100;
}

export function classifyTrend(
  overallChangePct: number | null,
  stableThresholdPct = 1
): TrendDirection {
  if (overallChangePct === null) {
    return "insufficient_data";
  }

  if (overallChangePct > stableThresholdPct) {
    return "increasing";
  }

  if (overallChangePct < -stableThresholdPct) {
    return "decreasing";
  }

  return "stable";
}

function getMetricUnit(
  metric: MarketTrendMetric
): "properties" | "USD" | "days" {
  if (metric === "median_close_price") {
    return "USD";
  }

  return TREND_METRIC_DEFINITIONS[metric].unit;
}

function getMetricDecimals(metric: MarketTrendMetric): number {
  if (metric === "median_close_price") {
    return 2;
  }

  return TREND_METRIC_DEFINITIONS[metric].decimals;
}

function buildComparison(
  monthlyData: MonthlyTrendPoint[]
): MarketTrendResult["comparison"] {
  const first = monthlyData[0];
  const latest = monthlyData[monthlyData.length - 1];
  const previous =
    monthlyData.length >= 2
      ? monthlyData[monthlyData.length - 2]
      : null;

  const overallChange = latest.value - first.value;
  const overallChangePct = percentageChange(first.value, latest.value);
  const monthOverMonthChangePct = previous
    ? percentageChange(previous.value, latest.value)
    : null;

  return {
    firstMonth: first.month,
    firstMonthValue: first.value,
    latestMonth: latest.month,
    latestMonthValue: latest.value,
    overallChange: round(overallChange, 2),
    overallChangePct:
      overallChangePct === null ? null : round(overallChangePct, 2),
    previousMonthValue: previous?.value ?? null,
    monthOverMonthChangePct:
      monthOverMonthChangePct === null
        ? null
        : round(monthOverMonthChangePct, 2),
  };
}

async function getMedianMonthlyData(
  filter: MarketFilter,
  queryFn: QueryFunction
): Promise<MonthlyTrendPoint[]> {
  const sql = `
    SELECT
      DATE_FORMAT(
        STR_TO_DATE(CloseDate, '%Y-%m-%d'),
        '%Y-%m'
      ) AS month,
      ClosePrice AS close_price
    FROM california_sold
    WHERE ${filter.whereClause}
      AND ${MARKET_VALUE_RULES.validClosePrice}
    ORDER BY STR_TO_DATE(CloseDate, '%Y-%m-%d')
  `;

  const rows = await queryFn<MedianTrendRow>(
    sql,
    filter.params as any[]
  );

  const grouped = new Map<string, number[]>();

  for (const row of rows) {
    const value = toNumber(row.close_price);

    if (!row.month || value === null || value <= 0) {
      continue;
    }

    const values = grouped.get(row.month) ?? [];
    values.push(value);
    grouped.set(row.month, values);
  }

  return [...grouped.entries()]
    .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
    .map(([month, values]) => ({
      month,
      value: round(calculateMedian(values) ?? 0, 2),
      recordCount: values.length,
    }))
    .filter((point) => point.recordCount > 0);
}

async function getAggregateMonthlyData(
  metric: Exclude<MarketTrendMetric, "median_close_price">,
  filter: MarketFilter,
  queryFn: QueryFunction
): Promise<MonthlyTrendPoint[]> {
  const definition = TREND_METRIC_DEFINITIONS[metric];
  const metricCondition = definition.validityRule
    ? `AND ${definition.validityRule}`
    : "";

  const sql = `
    SELECT
      DATE_FORMAT(
        STR_TO_DATE(CloseDate, '%Y-%m-%d'),
        '%Y-%m'
      ) AS month,
      ${definition.expression} AS metric_value,
      COUNT(*) AS record_count
    FROM california_sold
    WHERE ${filter.whereClause}
      ${metricCondition}
    GROUP BY DATE_FORMAT(
      STR_TO_DATE(CloseDate, '%Y-%m-%d'),
      '%Y-%m'
    )
    ORDER BY month
  `;

  const rows = await queryFn<AggregateTrendRow>(
    sql,
    filter.params as any[]
  );

  return rows
    .map((row) => {
      const value = toNumber(row.metric_value);
      const recordCount = toNumber(row.record_count) ?? 0;

      if (!row.month || value === null || recordCount === 0) {
        return null;
      }

      return {
        month: row.month,
        value: round(value, definition.decimals),
        recordCount,
      };
    })
    .filter((point): point is MonthlyTrendPoint => point !== null);
}

/**
 * Returns monthly market data and trend comparisons for one supported metric.
 */
export async function getMarketTrend(
  city: string,
  metric: MarketTrendMetric = "median_close_price",
  dependencies: MarketTrendDependencies = {}
): Promise<MarketTrendResult> {
  const queryFn = dependencies.queryFn ?? query;
  const buildFilterFn = dependencies.buildFilterFn ?? buildMarketFilter;
  const filter = await buildFilterFn(city);

  const monthlyData =
    metric === "median_close_price"
      ? await getMedianMonthlyData(filter, queryFn)
      : await getAggregateMonthlyData(metric, filter, queryFn);

  if (monthlyData.length < 2) {
    throw new Error(
      `At least two months of valid data are required to calculate the ${metric} trend for ${filter.normalizedCity}.`
    );
  }

  const comparison = buildComparison(monthlyData);

  return {
    status: "success",
    intent: "market_trend",
    city: filter.normalizedCity,
    period: {
      months: filter.period.months,
      startDate: filter.period.startDate,
      endDate: filter.period.endDate,
    },
    metric: {
      name: metric,
      unit: getMetricUnit(metric),
    },
    monthlyData,
    comparison,
    trendDirection: classifyTrend(comparison.overallChangePct),
  };
}
