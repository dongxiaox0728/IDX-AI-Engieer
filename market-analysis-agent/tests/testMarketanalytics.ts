import assert from "node:assert/strict";
import test from "node:test";
import {
  handleMarketRequest,
  MarketAnalyticsDependencies,
} from "../src/marketAnalytics";
import { MarketSummaryResult } from "../src/marketSummary";
import { MarketMetricResult } from "../src/marketMetric";
import { MarketTrendResult } from "../src/marketTrend";
import { MarketConditionResult } from "../src/marketCondition";

const period = {
  months: 12,
  startDate: "2025-06-15",
  endDate: "2026-06-15",
};

const summaryResult: MarketSummaryResult = {
  status: "success",
  intent: "market_summary",
  city: "San Diego",
  period,
  metrics: {
    soldCount: 100,
    averageClosePrice: 900000,
    medianClosePrice: 850000,
    averagePricePerSqft: 500,
    averageDaysOnMarket: 25,
    averageListToCloseRatio: 98.5,
  },
  recordsUsed: {
    sales: 100,
    closePrice: 100,
    pricePerSqft: 95,
    daysOnMarket: 100,
    listToCloseRatio: 98,
  },
};

const metricResult: MarketMetricResult = {
  status: "success",
  intent: "market_metric",
  city: "Pasadena",
  period,
  metric: {
    name: "average_close_price",
    value: 1200000,
    unit: "USD",
  },
  recordCount: 50,
};

const trendResult: MarketTrendResult = {
  status: "success",
  intent: "market_trend",
  city: "Irvine",
  period,
  metric: {
    name: "median_close_price",
    unit: "USD",
  },
  monthlyData: [
    {
      month: "2025-07",
      value: 1000000,
      recordCount: 25,
    },
    {
      month: "2026-06",
      value: 1050000,
      recordCount: 28,
    },
  ],
  comparison: {
    firstMonth: "2025-07",
    firstMonthValue: 1000000,
    latestMonth: "2026-06",
    latestMonthValue: 1050000,
    overallChange: 50000,
    overallChangePct: 5,
    previousMonthValue: 1000000,
    monthOverMonthChangePct: 5,
  },
  trendDirection: "increasing",
};

const conditionResult: MarketConditionResult = {
  status: "success",
  intent: "market_condition",
  city: "Sacramento",
  period,
  indicators: {
    medianPriceChangePct: -2,
    daysOnMarketChangePct: 10,
    salesVolumeChangePct: -5,
    averageListToCloseRatio: 97.5,
  },
  signals: {
    priceSignal: "buyer_favorable",
    daysOnMarketSignal: "buyer_favorable",
    salesVolumeSignal: "buyer_favorable",
    negotiationSignal: "buyer_favorable",
  },
  classification: {
    marketLabel: "buyer_favorable",
    confidence: "high",
  },
  explanation: "Conditions appear more favorable to buyers.",
};

test("routes market_summary to getMarketSummary", async () => {
  let receivedCity = "";

  const dependencies: MarketAnalyticsDependencies = {
    getSummaryFn: async (city) => {
      receivedCity = city;
      return summaryResult;
    },
  };

  const result = await handleMarketRequest(
    {
      intent: "market_summary",
      city: "San Diego",
    },
    dependencies
  );

  assert.equal(receivedCity, "San Diego");
  assert.equal(result.intent, "market_summary");
  assert.deepEqual(result, summaryResult);
});

test("routes market_metric with the requested metric", async () => {
  let receivedCity = "";
  let receivedMetric = "";

  const result = await handleMarketRequest(
    {
      intent: "market_metric",
      city: "Pasadena",
      metric: "average_close_price",
    },
    {
      getMetricFn: async (city, metric) => {
        receivedCity = city;
        receivedMetric = metric;
        return metricResult;
      },
    }
  );

  assert.equal(receivedCity, "Pasadena");
  assert.equal(receivedMetric, "average_close_price");
  assert.deepEqual(result, metricResult);
});

test("routes market_trend with the requested metric", async () => {
  let receivedMetric = "";

  const result = await handleMarketRequest(
    {
      intent: "market_trend",
      city: "Irvine",
      metric: "average_days_on_market",
    },
    {
      getTrendFn: async (_city, metric) => {
        receivedMetric = metric ?? "median_close_price";
        return {
          ...trendResult,
          metric: {
            name: "average_days_on_market",
            unit: "days",
          },
        };
      },
    }
  );

  assert.equal(receivedMetric, "average_days_on_market");
  assert.equal(result.intent, "market_trend");
});

test("uses median_close_price as the default trend metric", async () => {
  let receivedMetric = "";

  await handleMarketRequest(
    {
      intent: "market_trend",
      city: "Irvine",
    },
    {
      getTrendFn: async (_city, metric) => {
        receivedMetric = metric ?? "median_close_price";
        return trendResult;
      },
    }
  );

  assert.equal(receivedMetric, "median_close_price");
});

test("routes market_condition to getMarketCondition", async () => {
  let receivedCity = "";

  const result = await handleMarketRequest(
    {
      intent: "market_condition",
      city: "Sacramento",
    },
    {
      getConditionFn: async (city) => {
        receivedCity = city;
        return conditionResult;
      },
    }
  );

  assert.equal(receivedCity, "Sacramento");
  assert.deepEqual(result, conditionResult);
});

test("throws a clear error when city is missing", async () => {
  await assert.rejects(
    () =>
      handleMarketRequest(
        {
          intent: "market_summary",
          city: "   ",
        },
        {
          getSummaryFn: async () => summaryResult,
        }
      ),
    /A city is required/
  );
});
