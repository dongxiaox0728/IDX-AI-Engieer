import {
  getMarketSummary,
  MarketSummaryResult,
} from "./marketSummary";
import {
  getMarketMetric,
  MarketMetricName,
  MarketMetricResult,
} from "./marketMetric";
import {
  getMarketTrend,
  MarketTrendMetric,
  MarketTrendResult,
} from "./marketTrend";
import {
  getMarketCondition,
  MarketConditionResult,
} from "./marketCondition";

export type MarketRequest =
  | {
      intent: "market_summary";
      city: string;
    }
  | {
      intent: "market_metric";
      city: string;
      metric: MarketMetricName;
    }
  | {
      intent: "market_trend";
      city: string;
      metric?: MarketTrendMetric;
    }
  | {
      intent: "market_condition";
      city: string;
    };

export type MarketAnalyticsResult =
  | MarketSummaryResult
  | MarketMetricResult
  | MarketTrendResult
  | MarketConditionResult;

export interface MarketAnalyticsDependencies {
  getSummaryFn?: typeof getMarketSummary;
  getMetricFn?: typeof getMarketMetric;
  getTrendFn?: typeof getMarketTrend;
  getConditionFn?: typeof getMarketCondition;
}

function assertNonEmptyCity(city: string): void {
  if (!city || !city.trim()) {
    throw new Error("A city is required for market analytics.");
  }
}

/**
 * Routes one structured market request to the correct analytics function.
 *
 * This file does not parse natural language. It expects the parser to have
 * already produced a valid MarketRequest object.
 */
export async function handleMarketRequest(
  request: MarketRequest,
  dependencies: MarketAnalyticsDependencies = {}
): Promise<MarketAnalyticsResult> {
  assertNonEmptyCity(request.city);

  const getSummaryFn =
    dependencies.getSummaryFn ?? getMarketSummary;
  const getMetricFn =
    dependencies.getMetricFn ?? getMarketMetric;
  const getTrendFn =
    dependencies.getTrendFn ?? getMarketTrend;
  const getConditionFn =
    dependencies.getConditionFn ?? getMarketCondition;

  switch (request.intent) {
    case "market_summary":
      return getSummaryFn(request.city);

    case "market_metric":
      return getMetricFn(request.city, request.metric);

    case "market_trend":
      return getTrendFn(
        request.city,
        request.metric ?? "median_close_price"
      );

    case "market_condition":
      return getConditionFn(request.city);

    default: {
      const exhaustiveCheck: never = request;
      throw new Error(
        `Unsupported market request: ${JSON.stringify(exhaustiveCheck)}`
      );
    }
  }
}
