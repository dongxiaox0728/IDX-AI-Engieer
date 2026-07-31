import assert from "node:assert/strict";
import test from "node:test";
import { parseMarketQuery } from "../src/parseMarketQuery";

const options = {
  supportedCities: [
    "San Diego",
    "Pasadena",
    "Irvine",
    "Sacramento",
    "Los Angeles",
  ],
};

test("parses a market summary question", () => {
  const result = parseMarketQuery(
    "How is the San Diego housing market?",
    options
  );

  assert.deepEqual(result, {
    intent: "market_summary",
    city: "San Diego",
  });
});

test("parses an average close price question", () => {
  const result = parseMarketQuery(
    "What is the average home price in Pasadena?",
    options
  );

  assert.deepEqual(result, {
    intent: "market_metric",
    city: "Pasadena",
    metric: "average_close_price",
  });
});

test("parses a median price question", () => {
  const result = parseMarketQuery(
    "What is the median price in Irvine?",
    options
  );

  assert.deepEqual(result, {
    intent: "market_metric",
    city: "Irvine",
    metric: "median_close_price",
  });
});

test("parses a price-per-square-foot question", () => {
  const result = parseMarketQuery(
    "What is the average price per square foot in Sacramento?",
    options
  );

  assert.deepEqual(result, {
    intent: "market_metric",
    city: "Sacramento",
    metric: "average_price_per_sqft",
  });
});

test("parses a days-on-market question", () => {
  const result = parseMarketQuery(
    "What is the average days on market in Los Angeles?",
    options
  );

  assert.deepEqual(result, {
    intent: "market_metric",
    city: "Los Angeles",
    metric: "average_days_on_market",
  });
});

test("parses a sold-count question", () => {
  const result = parseMarketQuery(
    "How many homes sold in San Diego?",
    options
  );

  assert.deepEqual(result, {
    intent: "market_metric",
    city: "San Diego",
    metric: "sold_count",
  });
});

test("prioritizes a trend over a specific price metric", () => {
  const result = parseMarketQuery(
    "Is the average price in San Diego increasing?",
    options
  );

  assert.deepEqual(result, {
    intent: "market_trend",
    city: "San Diego",
    metric: "average_close_price",
  });
});

test("uses median close price for a general price trend", () => {
  const result = parseMarketQuery(
    "Are home prices going up in Irvine?",
    options
  );

  assert.deepEqual(result, {
    intent: "market_trend",
    city: "Irvine",
    metric: "median_close_price",
  });
});

test("detects a days-on-market trend", () => {
  const result = parseMarketQuery(
    "Are homes taking longer to sell in Sacramento?",
    options
  );

  assert.deepEqual(result, {
    intent: "market_trend",
    city: "Sacramento",
    metric: "average_days_on_market",
  });
});

test("detects a sales-volume trend", () => {
  const result = parseMarketQuery(
    "Is sales volume decreasing in Pasadena?",
    options
  );

  assert.deepEqual(result, {
    intent: "market_trend",
    city: "Pasadena",
    metric: "sold_count",
  });
});

test("prioritizes market condition over other categories", () => {
  const result = parseMarketQuery(
    "Is San Diego a buyer's market?",
    options
  );

  assert.deepEqual(result, {
    intent: "market_condition",
    city: "San Diego",
  });
});

test("matches city names regardless of capitalization", () => {
  const result = parseMarketQuery(
    "give me a market overview for san diego",
    options
  );

  assert.equal(result.city, "San Diego");
});

test("throws when the city is not supported", () => {
  assert.throws(
    () =>
      parseMarketQuery(
        "What is the average price in Fresno?",
        options
      ),
    /No supported city/
  );
});

test("throws when the question type is unsupported", () => {
  assert.throws(
    () =>
      parseMarketQuery(
        "Tell me something about Pasadena.",
        options
      ),
    /does not match a supported/
  );
});

test("throws when the question is empty", () => {
  assert.throws(
    () => parseMarketQuery("   ", options),
    /A market question is required/
  );
});
