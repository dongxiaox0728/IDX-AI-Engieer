import assert from "node:assert/strict";
import test from "node:test";
import { MarketFilter } from "../src/marketFilters";
import {
  getMarketMetric,
  MarketMetricName,
} from "../src/marketMetric";

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

test("getMarketMetric returns average close price", async () => {
  const mockQuery = async <T>(): Promise<T[]> =>
    [
      {
        metric_value: 912345.678,
        record_count: 125,
      },
    ] as T[];

  const result = await getMarketMetric(
    "San Diego",
    "average_close_price",
    {
      queryFn: mockQuery,
      buildFilterFn: async () => mockFilter,
    }
  );

  assert.deepEqual(result, {
    status: "success",
    intent: "market_metric",
    city: "San Diego",
    period: {
      months: 12,
      startDate: "2025-06-15",
      endDate: "2026-06-15",
    },
    metric: {
      name: "average_close_price",
      value: 912345.68,
      unit: "USD",
    },
    recordCount: 125,
  });
});

test("getMarketMetric returns median close price", async () => {
  const mockQuery = async <T>(): Promise<T[]> =>
    [
      { close_price: 500000 },
      { close_price: 700000 },
      { close_price: 600000 },
      { close_price: 800000 },
    ] as T[];

  const result = await getMarketMetric(
    "San Diego",
    "median_close_price",
    {
      queryFn: mockQuery,
      buildFilterFn: async () => mockFilter,
    }
  );

  assert.equal(result.metric.value, 650000);
  assert.equal(result.metric.unit, "USD");
  assert.equal(result.recordCount, 4);
});

test("getMarketMetric returns average days on market", async () => {
  const mockQuery = async <T>(): Promise<T[]> =>
    [
      {
        metric_value: 27.256,
        record_count: 80,
      },
    ] as T[];

  const result = await getMarketMetric(
    "San Diego",
    "average_days_on_market",
    {
      queryFn: mockQuery,
      buildFilterFn: async () => mockFilter,
    }
  );

  assert.equal(result.metric.value, 27.3);
  assert.equal(result.metric.unit, "days");
  assert.equal(result.recordCount, 80);
});

test("getMarketMetric returns sold count", async () => {
  const mockQuery = async <T>(): Promise<T[]> =>
    [
      {
        metric_value: 240,
        record_count: 240,
      },
    ] as T[];

  const result = await getMarketMetric(
    "San Diego",
    "sold_count",
    {
      queryFn: mockQuery,
      buildFilterFn: async () => mockFilter,
    }
  );

  assert.equal(result.metric.value, 240);
  assert.equal(result.metric.unit, "properties");
});

test("getMarketMetric throws a clear error when no valid values exist", async () => {
  const mockQuery = async <T>(): Promise<T[]> =>
    [
      {
        metric_value: null,
        record_count: 0,
      },
    ] as T[];

  await assert.rejects(
    () =>
      getMarketMetric(
        "Unknown City",
        "average_close_price",
        {
          queryFn: mockQuery,
          buildFilterFn: async () => ({
            ...mockFilter,
            normalizedCity: "Unknown City",
          }),
        }
      ),
    /No valid values were found/
  );
});

test("all supported non-median metrics use a safe predefined query", async () => {
  const metrics: Exclude<MarketMetricName, "median_close_price">[] = [
    "sold_count",
    "average_close_price",
    "average_price_per_sqft",
    "average_days_on_market",
    "average_list_to_close_ratio",
  ];

  for (const metric of metrics) {
    let capturedSql = "";

    const mockQuery = async <T>(
      sql: string
    ): Promise<T[]> => {
      capturedSql = sql;
      return [
        {
          metric_value: 1,
          record_count: 1,
        },
      ] as T[];
    };

    await getMarketMetric("San Diego", metric, {
      queryFn: mockQuery,
      buildFilterFn: async () => mockFilter,
    });

    assert.ok(capturedSql.includes("FROM california_sold"));
    assert.ok(!capturedSql.includes("undefined"));
  }
});
