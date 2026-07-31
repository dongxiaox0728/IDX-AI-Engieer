import assert from "node:assert/strict";
import test from "node:test";
import { MarketFilter } from "../src/marketFilters";
import {
  calculateMedian,
  getMarketSummary,
} from "../src/marketSummary";

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

test("calculateMedian returns the middle value for an odd-length list", () => {
  assert.equal(calculateMedian([300, 100, 200]), 200);
});

test("calculateMedian averages the two middle values for an even-length list", () => {
  assert.equal(calculateMedian([400, 100, 300, 200]), 250);
});

test("calculateMedian returns null for an empty list", () => {
  assert.equal(calculateMedian([]), null);
});

test("getMarketSummary returns the expected structured result", async () => {
  let queryCall = 0;

  const mockQuery = async <T>(): Promise<T[]> => {
    queryCall += 1;

    if (queryCall === 1) {
      return [
        {
          sold_count: 4,
          close_price_count: 4,
          average_close_price: 625000,
          price_per_sqft_count: 3,
          average_price_per_sqft: 410.456,
          days_on_market_count: 4,
          average_days_on_market: 27.25,
          list_to_close_count: 4,
          average_list_to_close_ratio: 98.746,
        },
      ] as T[];
    }

    return [
      { close_price: 500000 },
      { close_price: 600000 },
      { close_price: 650000 },
      { close_price: 750000 },
    ] as T[];
  };

  const result = await getMarketSummary("  San Diego  ", {
    queryFn: mockQuery,
    buildFilterFn: async () => mockFilter,
  });

  assert.deepEqual(result, {
    status: "success",
    intent: "market_summary",
    city: "San Diego",
    period: {
      months: 12,
      startDate: "2025-06-15",
      endDate: "2026-06-15",
    },
    metrics: {
      soldCount: 4,
      averageClosePrice: 625000,
      medianClosePrice: 625000,
      averagePricePerSqft: 410.46,
      averageDaysOnMarket: 27.3,
      averageListToCloseRatio: 98.7,
    },
    recordsUsed: {
      sales: 4,
      closePrice: 4,
      pricePerSqft: 3,
      daysOnMarket: 4,
      listToCloseRatio: 4,
    },
  });
});

test("getMarketSummary throws a clear error when no records are found", async () => {
  const mockQuery = async <T>(): Promise<T[]> =>
    [
      {
        sold_count: 0,
        close_price_count: 0,
        average_close_price: null,
        price_per_sqft_count: 0,
        average_price_per_sqft: null,
        days_on_market_count: 0,
        average_days_on_market: null,
        list_to_close_count: 0,
        average_list_to_close_ratio: null,
      },
    ] as T[];

  await assert.rejects(
    () =>
      getMarketSummary("Unknown City", {
        queryFn: mockQuery,
        buildFilterFn: async () => ({
          ...mockFilter,
          normalizedCity: "Unknown City",
        }),
      }),
    /No valid sold-property records were found/
  );
});
