import assert from "node:assert/strict";
import test from "node:test";
import { MarketMetricResult } from "../src/marketMetric";
import {
  classifyDaysOnMarketSignal,
  classifyNegotiationSignal,
  classifyPriceSignal,
  classifySalesVolumeSignal,
  getMarketCondition,
} from "../src/marketCondition";
import {
  MarketTrendMetric,
  MarketTrendResult,
} from "../src/marketTrend";

function makeTrend(
  metric: MarketTrendMetric,
  overallChangePct: number
): MarketTrendResult {
  const unit =
    metric === "sold_count"
      ? "properties"
      : metric === "average_days_on_market"
        ? "days"
        : "USD";

  return {
    status: "success",
    intent: "market_trend",
    city: "San Diego",
    period: {
      months: 12,
      startDate: "2025-06-15",
      endDate: "2026-06-15",
    },
    metric: {
      name: metric,
      unit,
    },
    monthlyData: [
      {
        month: "2025-07",
        value: 100,
        recordCount: 10,
      },
      {
        month: "2026-06",
        value: 100 + overallChangePct,
        recordCount: 10,
      },
    ],
    comparison: {
      firstMonth: "2025-07",
      firstMonthValue: 100,
      latestMonth: "2026-06",
      latestMonthValue: 100 + overallChangePct,
      overallChange: overallChangePct,
      overallChangePct,
      previousMonthValue: 100,
      monthOverMonthChangePct: overallChangePct,
    },
    trendDirection:
      overallChangePct > 1
        ? "increasing"
        : overallChangePct < -1
          ? "decreasing"
          : "stable",
  };
}

const ratioMetric: MarketMetricResult = {
  status: "success",
  intent: "market_metric",
  city: "San Diego",
  period: {
    months: 12,
    startDate: "2025-06-15",
    endDate: "2026-06-15",
  },
  metric: {
    name: "average_list_to_close_ratio",
    value: 97.5,
    unit: "percent",
  },
  recordCount: 100,
};

test("individual signal classifiers follow the expected direction", () => {
  assert.equal(classifyPriceSignal(-4), "buyer_favorable");
  assert.equal(classifyPriceSignal(4), "seller_favorable");
  assert.equal(
    classifyDaysOnMarketSignal(10),
    "buyer_favorable"
  );
  assert.equal(
    classifySalesVolumeSignal(-10),
    "buyer_favorable"
  );
  assert.equal(
    classifyNegotiationSignal(97.5),
    "buyer_favorable"
  );
});

test("getMarketCondition returns a buyer-favorable result", async () => {
  const mockGetTrend = async (
    _city: string,
    metric?: MarketTrendMetric
  ): Promise<MarketTrendResult> => {
    const requestedMetric = metric ?? "median_close_price";

    if (requestedMetric === "median_close_price") {
      return makeTrend(requestedMetric, -4);
    }

    if (requestedMetric === "average_days_on_market") {
      return makeTrend(requestedMetric, 12);
    }

    return makeTrend(requestedMetric, -8);
  };

  const mockGetMetric = async (): Promise<MarketMetricResult> =>
    ratioMetric;

  const result = await getMarketCondition("San Diego", {
    getTrendFn: mockGetTrend,
    getMetricFn: mockGetMetric,
  });

  assert.equal(
    result.classification.marketLabel,
    "buyer_favorable"
  );
  assert.equal(result.classification.confidence, "high");
  assert.deepEqual(result.signals, {
    priceSignal: "buyer_favorable",
    daysOnMarketSignal: "buyer_favorable",
    salesVolumeSignal: "buyer_favorable",
    negotiationSignal: "buyer_favorable",
  });
  assert.match(result.explanation, /favorable to buyers/);
});

test("getMarketCondition returns mixed when signals are tied", async () => {
  const mockGetTrend = async (
    _city: string,
    metric?: MarketTrendMetric
  ): Promise<MarketTrendResult> => {
    const requestedMetric = metric ?? "median_close_price";

    if (requestedMetric === "median_close_price") {
      return makeTrend(requestedMetric, 5);
    }

    if (requestedMetric === "average_days_on_market") {
      return makeTrend(requestedMetric, 10);
    }

    return makeTrend(requestedMetric, 6);
  };

  const mixedRatio: MarketMetricResult = {
    ...ratioMetric,
    metric: {
      ...ratioMetric.metric,
      value: 97.5,
    },
  };

  const result = await getMarketCondition("San Diego", {
    getTrendFn: mockGetTrend,
    getMetricFn: async () => mixedRatio,
  });

  assert.equal(result.classification.marketLabel, "mixed");
  assert.equal(result.classification.confidence, "low");
  assert.match(result.explanation, /mixed conditions/);
});
