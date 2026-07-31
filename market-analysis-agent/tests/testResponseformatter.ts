import assert from "node:assert/strict";
import test from "node:test";
import {
  formatCurrency,
  formatMarketResponse,
  formatMonth,
  formatPercent,
} from "../src/marketResponseFormatter";
import { MarketSummaryResult } from "../src/marketSummary";
import { MarketMetricResult } from "../src/marketMetric";
import { MarketTrendResult } from "../src/marketTrend";
import { MarketConditionResult } from "../src/marketCondition";

const period = {
  months: 12,
  startDate: "2025-06-15",
  endDate: "2026-06-15",
};

test("formatCurrency formats US dollar values", () => {
  assert.equal(formatCurrency(1200000), "$1,200,000");
  assert.equal(formatCurrency(null), "not available");
});

test("formatPercent formats percentage values", () => {
  assert.equal(formatPercent(98.7), "98.7%");
  assert.equal(formatPercent(null), "not available");
});

test("formatMonth converts YYYY-MM into a readable month", () => {
  assert.equal(formatMonth("2026-06"), "June 2026");
});

test("formats a market summary result", () => {
  const result: MarketSummaryResult = {
    status: "success",
    intent: "market_summary",
    city: "San Diego",
    period,
    metrics: {
      soldCount: 3250,
      averageClosePrice: 912000,
      medianClosePrice: 825000,
      averagePricePerSqft: 528.42,
      averageDaysOnMarket: 26.4,
      averageListToCloseRatio: 98.7,
    },
    recordsUsed: {
      sales: 3250,
      closePrice: 3250,
      pricePerSqft: 3100,
      daysOnMarket: 3250,
      listToCloseRatio: 3195,
    },
  };

  const response = formatMarketResponse(result);

  assert.match(response, /3,250 properties sold in San Diego/);
  assert.match(response, /\$825,000/);
  assert.match(response, /\$912,000/);
  assert.match(response, /\$528/);
  assert.match(response, /26.4 days/);
  assert.match(response, /98.7% of list price/);
});

test("formats a specific market metric result", () => {
  const result: MarketMetricResult = {
    status: "success",
    intent: "market_metric",
    city: "Pasadena",
    period,
    metric: {
      name: "average_close_price",
      value: 1275000,
      unit: "USD",
    },
    recordCount: 847,
  };

  const response = formatMarketResponse(result);

  assert.match(response, /average close price in Pasadena/);
  assert.match(response, /\$1,275,000/);
  assert.match(response, /847 valid records/);
});

test("formats a price-per-square-foot metric with its unit", () => {
  const result: MarketMetricResult = {
    status: "success",
    intent: "market_metric",
    city: "Irvine",
    period,
    metric: {
      name: "average_price_per_sqft",
      value: 650.25,
      unit: "USD_per_sqft",
    },
    recordCount: 500,
  };

  const response = formatMarketResponse(result);

  assert.match(response, /\$650 per square foot/);
});

test("formats an increasing market trend", () => {
  const result: MarketTrendResult = {
    status: "success",
    intent: "market_trend",
    city: "San Diego",
    period,
    metric: {
      name: "median_close_price",
      unit: "USD",
    },
    monthlyData: [
      {
        month: "2025-07",
        value: 790000,
        recordCount: 245,
      },
      {
        month: "2026-05",
        value: 823500,
        recordCount: 270,
      },
      {
        month: "2026-06",
        value: 835000,
        recordCount: 281,
      },
    ],
    comparison: {
      firstMonth: "2025-07",
      firstMonthValue: 790000,
      latestMonth: "2026-06",
      latestMonthValue: 835000,
      overallChange: 45000,
      overallChangePct: 5.7,
      previousMonthValue: 823500,
      monthOverMonthChangePct: 1.4,
    },
    trendDirection: "increasing",
  };

  const response = formatMarketResponse(result);

  assert.match(response, /median close price increased/);
  assert.match(response, /\$790,000 in July 2025/);
  assert.match(response, /\$835,000 in June 2026/);
  assert.match(response, /overall change of 5.7%/);
  assert.match(response, /increased by 1.4%/);
});

test("formats a decreasing days-on-market trend correctly", () => {
  const result: MarketTrendResult = {
    status: "success",
    intent: "market_trend",
    city: "Sacramento",
    period,
    metric: {
      name: "average_days_on_market",
      unit: "days",
    },
    monthlyData: [
      {
        month: "2025-07",
        value: 30,
        recordCount: 100,
      },
      {
        month: "2026-06",
        value: 24,
        recordCount: 110,
      },
    ],
    comparison: {
      firstMonth: "2025-07",
      firstMonthValue: 30,
      latestMonth: "2026-06",
      latestMonthValue: 24,
      overallChange: -6,
      overallChangePct: -20,
      previousMonthValue: 25,
      monthOverMonthChangePct: -4,
    },
    trendDirection: "decreasing",
  };

  const response = formatMarketResponse(result);

  assert.match(response, /average days on market decreased/);
  assert.match(response, /30 days/);
  assert.match(response, /24 days/);
  assert.match(response, /overall change of 20%/);
});

test("formats a market condition result", () => {
  const result: MarketConditionResult = {
    status: "success",
    intent: "market_condition",
    city: "Sacramento",
    period,
    indicators: {
      medianPriceChangePct: -2.3,
      daysOnMarketChangePct: 14.6,
      salesVolumeChangePct: -8.1,
      averageListToCloseRatio: 97.8,
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
    explanation:
      "Conditions appear more favorable to buyers because median prices declined.",
  };

  const response = formatMarketResponse(result);

  assert.match(response, /Sacramento showed buyer-favorable/);
  assert.match(response, /high confidence/);
  assert.match(response, /median prices declined/);
});
