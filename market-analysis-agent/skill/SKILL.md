---
name: california-market-analytics
description: Answer California housing market questions using historical sold-property data from california_sold.
---

# California Market Analytics

Use this skill when a user asks for data-backed housing market analysis for a California city.

This is a separate skill from property search. Use the `property-search-agent` skill when the user wants to find active listings with features, locations, bedrooms, price limits, or other listing filters.

## Supported questions

The skill supports four categories.

### 1. Market summary

Examples:

- How is the San Diego housing market?
- Give me a market overview for Pasadena.
- What does the Sacramento real estate market look like?

Return a concise summary containing:

- sold-property count
- average close price
- median close price
- average price per square foot
- average days on market
- average list-to-close ratio

### 2. Specific market metric

Examples:

- What is the average home price in Pasadena?
- What is the median close price in Irvine?
- What is the average price per square foot in San Diego?
- What is the average number of days on market in Sacramento?
- How many properties sold in Los Angeles?
- What is the average list-to-close ratio in San Diego?

Supported metrics:

- `sold_count`
- `average_close_price`
- `median_close_price`
- `average_price_per_sqft`
- `average_days_on_market`
- `average_list_to_close_ratio`

### 3. Market trend

Examples:

- Are home prices increasing in San Diego?
- How have Pasadena prices changed over time?
- Are homes taking longer to sell in Irvine?
- Is Sacramento sales volume decreasing?

Supported trend metrics:

- `sold_count`
- `average_close_price`
- `median_close_price`
- `average_days_on_market`

### 4. Market condition

Examples:

- Is San Diego a buyer's market?
- Is now a good time to buy in Sacramento?
- Does the Irvine market favor sellers?
- Who has more negotiating power in Pasadena?

The response should describe the evidence rather than making an absolute financial recommendation. The analysis combines:

- median-price change
- days-on-market change
- sales-volume change
- average list-to-close ratio

Possible classifications include:

- buyer-favorable
- seller-favorable
- balanced
- mixed
- insufficient data

## Data and time-period rules

- Use the `california_sold` MySQL table.
- `CloseDate` is stored as text in `YYYY-MM-DD` format and must be converted before date calculations.
- Exclude invalid dates and dates after the current date.
- Use the latest valid non-future close date as the end of the analysis period.
- Use the preceding 12 months as the default period.
- Match city names without regard to capitalization and ignore leading or trailing spaces.
- Exclude invalid numeric values when required by a metric:
  - `ClosePrice > 0`
  - `ListPrice > 0`
  - `LivingArea > 0`
  - `DaysOnMarket >= 0`

## Execution flow

The implementation follows this sequence:

1. `answerMarketQuestion.ts`
2. `runMarketAnalytics.ts`
3. `parseMarketQuery.ts`
4. `marketAnalytics.ts`
5. One of:
   - `marketSummary.ts`
   - `marketMetric.ts`
   - `marketTrend.ts`
   - `marketCondition.ts`
6. `marketResponseFormatter.ts`

City names are loaded by `marketCities.ts`.

The local CLI entrypoint is `src/cli.ts`.

## Response behavior

- Return a readable response rather than raw JSON.
- State the analysis period.
- Format prices as U.S. dollars.
- Format ratios and changes as percentages.
- State when there is insufficient data.
- Do not claim certainty about whether an individual should buy or sell.
- Do not invent values when a query fails or a city is unavailable.

## Distinguishing this skill from property search

Use this market-analytics skill for aggregated or historical questions such as:

- average or median prices
- market trends
- sales volume
- days on market
- price per square foot
- buyer-versus-seller conditions

Use the `property-search-agent` skill for requests such as:

- Find three-bedroom homes under $800,000.
- Show active condos with a pool.
- Find listings in a ZIP code.
- Search for homes with particular features.

## Local testing

Run the live database test:

```bash
npx tsx tests/testMarketLive.ts
```

Run the market-analysis CLI from the `market-analysis-agent` directory:

```bash
npm run cli
```

Example market questions:

```text
How is the San Diego housing market?
What is the average home price in Pasadena?
Are homes taking longer to sell in Irvine?
Is Sacramento a buyer's market?
```
