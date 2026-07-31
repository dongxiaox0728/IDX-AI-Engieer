import assert from "node:assert/strict";
import test from "node:test";
import { runMarketAnalytics } from "../src/runMarketAnalytics";
import { MarketSummaryResult } from "../src/marketSummary";
import { MarketMetricResult } from "../src/marketMetric";
import { MarketTrendResult } from "../src/marketTrend";
import { MarketConditionResult } from "../src/marketCondition";

const period = {
  months: 12,
  startDate: "2025-06-15",
  endDate: "2026-06-15",
};

test("parses and routes a market summary question", async () => {
  let receivedCity = "";

  const expected: MarketSummaryResult = {
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

  const result = await runMarketAnalytics(
    "How is the San Diego housing market?",
    {
      supportedCities: ["San Diego", "Pasadena"],
      analyticsDependencies: {
        getSummaryFn: async (city) => {
          receivedCity = city;
          return expected;
        },
      },
    }
  );

  assert.equal(receivedCity, "San Diego");
  assert.deepEqual(result, expected);
});

test("parses and routes a specific metric question", async () => {
  let receivedCity = "";
  let receivedMetric = "";

  const expected: MarketMetricResult = {
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

  const result = await runMarketAnalytics(
    "What is the average home price in Pasadena?",
    {
      supportedCities: ["San Diego", "Pasadena"],
      analyticsDependencies: {
        getMetricFn: async (city, metric) => {
          receivedCity = city;
          receivedMetric = metric;
          return expected;
        },
      },
    }
  );

  assert.equal(receivedCity, "Pasadena");
  assert.equal(receivedMetric, "average_close_price");
  assert.deepEqual(result, expected);
});

test("parses and routes a market trend question", async () => {
  let receivedMetric = "";

  const expected: MarketTrendResult = {
    status: "success",
    intent: "market_trend",
    city: "Irvine",
    period,
    metric: {
      name: "average_days_on_market",
      unit: "days",
    },
    monthlyData: [
      {
        month: "2025-07",
        value: 20,
        recordCount: 25,
      },
      {
        month: "2026-06",
        value: 25,
        recordCount: 28,
      },
    ],
    comparison: {
      firstMonth: "2025-07",
      firstMonthValue: 20,
      latestMonth: "2026-06",
      latestMonthValue: 25,
      overallChange: 5,
      overallChangePct: 25,
      previousMonthValue: 24,
      monthOverMonthChangePct: 4.17,
    },
    trendDirection: "increasing",
  };

  const result = await runMarketAnalytics(
    "Are homes taking longer to sell in Irvine?",
    {
      supportedCities: ["Irvine"],
      analyticsDependencies: {
        getTrendFn: async (_city, metric) => {
          receivedMetric = metric ?? "median_close_price";
          return expected;
        },
      },
    }
  );

  assert.equal(receivedMetric, "average_days_on_market");
  assert.deepEqual(result, expected);
});

test("parses and routes a market condition question", async () => {
  let receivedCity = "";

  const expected: MarketConditionResult = {
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

  const result = await runMarketAnalytics(
    "Is Sacramento a buyer's market?",
    {
      supportedCities: ["Sacramento"],
      analyticsDependencies: {
        getConditionFn: async (city) => {
          receivedCity = city;
          return expected;
        },
      },
    }
  );

  assert.equal(receivedCity, "Sacramento");
  assert.deepEqual(result, expected);
});

test("throws when the supported city list is empty", async () => {
  await assert.rejects(
    () =>
      runMarketAnalytics(
        "How is the San Diego housing market?",
        {
          supportedCities: [],
        }
      ),
    /At least one supported city/
  );
});

test("passes parser errors through to the caller", async () => {
  await assert.rejects(
    () =>
      runMarketAnalytics(
        "What is the average home price in Fresno?",
        {
          supportedCities: ["San Diego", "Pasadena"],
        }
      ),
    /No supported city/
  );
});
