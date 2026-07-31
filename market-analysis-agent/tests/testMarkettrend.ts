import assert from "node:assert/strict";
import test from "node:test";
import { MarketFilter } from "../src/marketFilters";
import {
  classifyTrend,
  getMarketTrend,
} from "../src/marketTrend";

const mockFilter: MarketFilter = {
  normalizedCity: "San Diego",
  period: {
    months: 12,
    startDate: "2025-06-15",
    endDate: "2026-06-15",
  },
  whereClause: `
    STR_TO_DATE(CloseDate, '%Y-%m-%d') BETWEEN ? AND ?
    AND LOWER(TRIM(City)) = LOWER(?)
  `,
  params: ["2025-06-15", "2026-06-15", "San Diego"],
};

test("classifyTrend identifies increasing, decreasing, and stable trends", () => {
  assert.equal(classifyTrend(5), "increasing");
  assert.equal(classifyTrend(-5), "decreasing");
  assert.equal(classifyTrend(0.8), "stable");
  assert.equal(classifyTrend(null), "insufficient_data");
});

test("getMarketTrend returns an aggregate monthly trend", async () => {
  const mockQuery = async <T>(): Promise<T[]> =>
    [
      { month: "2025-07", metric_value: 20, record_count: 50 },
      { month: "2025-08", metric_value: 22, record_count: 55 },
      { month: "2025-09", metric_value: 25, record_count: 60 },
    ] as T[];

  const result = await getMarketTrend(
    "San Diego",
    "average_days_on_market",
    {
      queryFn: mockQuery,
      buildFilterFn: async () => mockFilter,
    }
  );

  assert.deepEqual(result.metric, {
    name: "average_days_on_market",
    unit: "days",
  });
  assert.equal(result.monthlyData.length, 3);
  assert.equal(result.comparison.firstMonthValue, 20);
  assert.equal(result.comparison.latestMonthValue, 25);
  assert.equal(result.comparison.overallChangePct, 25);
  assert.equal(result.comparison.monthOverMonthChangePct, 13.64);
  assert.equal(result.trendDirection, "increasing");
});

test("getMarketTrend calculates monthly median close prices", async () => {
  const mockQuery = async <T>(): Promise<T[]> =>
    [
      { month: "2025-07", close_price: 500000 },
      { month: "2025-07", close_price: 700000 },
      { month: "2025-08", close_price: 600000 },
      { month: "2025-08", close_price: 800000 },
    ] as T[];

  const result = await getMarketTrend(
    "San Diego",
    "median_close_price",
    {
      queryFn: mockQuery,
      buildFilterFn: async () => mockFilter,
    }
  );

  assert.deepEqual(result.monthlyData, [
    {
      month: "2025-07",
      value: 600000,
      recordCount: 2,
    },
    {
      month: "2025-08",
      value: 700000,
      recordCount: 2,
    },
  ]);
  assert.equal(result.comparison.overallChangePct, 16.67);
  assert.equal(result.trendDirection, "increasing");
});

test("getMarketTrend throws when fewer than two months are available", async () => {
  const mockQuery = async <T>(): Promise<T[]> =>
    [
      { month: "2025-07", metric_value: 100, record_count: 10 },
    ] as T[];

  await assert.rejects(
    () =>
      getMarketTrend("San Diego", "sold_count", {
        queryFn: mockQuery,
        buildFilterFn: async () => mockFilter,
      }),
    /At least two months/
  );
});
