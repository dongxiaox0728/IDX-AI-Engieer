import { MarketAnalyticsResult } from "./marketAnalytics";
import { MarketMetricName, MarketMetricUnit } from "./marketMetric";
import { MarketTrendMetric } from "./marketTrend";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function formatMonth(month: string): string {
  const parsed = new Date(`${month}-01T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return month;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function formatCurrency(value: number | null): string {
  return value === null ? "not available" : currencyFormatter.format(value);
}

export function formatPercent(value: number | null): string {
  return value === null ? "not available" : `${numberFormatter.format(value)}%`;
}

export function formatNumber(value: number | null): string {
  return value === null ? "not available" : numberFormatter.format(value);
}

function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

function formatPeriod(
  period: MarketAnalyticsResult["period"]
): string {
  return `${formatDate(period.startDate)} through ${formatDate(period.endDate)}`;
}

function formatMetricValue(
  metricName: MarketMetricName | MarketTrendMetric,
  value: number,
  unit: MarketMetricUnit | "properties" | "USD" | "days"
): string {
  if (unit === "USD") {
    return formatCurrency(value);
  }

  if (unit === "USD_per_sqft") {
    return `${formatCurrency(value)} per square foot`;
  }

  if (unit === "percent") {
    return formatPercent(value);
  }

  if (unit === "days") {
    return `${formatNumber(value)} days`;
  }

  if (unit === "properties") {
    return `${formatInteger(value)} properties`;
  }

  return formatNumber(value);
}

function metricLabel(
  metric: MarketMetricName | MarketTrendMetric
): string {
  const labels: Record<MarketMetricName, string> = {
    sold_count: "number of properties sold",
    average_close_price: "average close price",
    median_close_price: "median close price",
    average_price_per_sqft: "average price per square foot",
    average_days_on_market: "average days on market",
    average_list_to_close_ratio: "average list-to-close ratio",
  };

  return labels[metric];
}

function formatSummary(
  result: Extract<MarketAnalyticsResult, { intent: "market_summary" }>
): string {
  const { metrics } = result;

  return [
    `From ${formatPeriod(result.period)}, ${formatInteger(
      metrics.soldCount
    )} properties sold in ${result.city}.`,
    `The median close price was ${formatCurrency(
      metrics.medianClosePrice
    )}, while the average close price was ${formatCurrency(
      metrics.averageClosePrice
    )}.`,
    `The average price per square foot was ${formatCurrency(
      metrics.averagePricePerSqft
    )}, homes spent an average of ${formatNumber(
      metrics.averageDaysOnMarket
    )} days on the market, and properties closed at approximately ${formatPercent(
      metrics.averageListToCloseRatio
    )} of list price.`,
  ].join(" ");
}

function formatMetric(
  result: Extract<MarketAnalyticsResult, { intent: "market_metric" }>
): string {
  const label = metricLabel(result.metric.name);
  const value = formatMetricValue(
    result.metric.name,
    result.metric.value,
    result.metric.unit
  );

  return `From ${formatPeriod(result.period)}, the ${label} in ${
    result.city
  } was ${value}, based on ${formatInteger(
    result.recordCount
  )} valid records.`;
}

function directionWord(direction: string): string {
  if (direction === "increasing") return "increased";
  if (direction === "decreasing") return "decreased";
  if (direction === "stable") return "remained relatively stable";
  return "could not be determined reliably";
}

function formatTrend(
  result: Extract<MarketAnalyticsResult, { intent: "market_trend" }>
): string {
  const { comparison } = result;
  const label = metricLabel(result.metric.name);

  const firstValue = formatMetricValue(
    result.metric.name,
    comparison.firstMonthValue,
    result.metric.unit
  );

  const latestValue = formatMetricValue(
    result.metric.name,
    comparison.latestMonthValue,
    result.metric.unit
  );

  const overallChange =
    comparison.overallChangePct === null
      ? "The overall percentage change could not be calculated."
      : `This was an overall change of ${formatPercent(
          Math.abs(comparison.overallChangePct)
        )}.`;

  let latestMonthSentence = "";

  if (comparison.monthOverMonthChangePct !== null) {
    const direction =
      comparison.monthOverMonthChangePct > 0
        ? "increased"
        : comparison.monthOverMonthChangePct < 0
          ? "decreased"
          : "did not change";

    latestMonthSentence = ` From the previous month to ${formatMonth(
      comparison.latestMonth
    )}, it ${direction} by ${formatPercent(
      Math.abs(comparison.monthOverMonthChangePct)
    )}.`;
  }

  return `In ${result.city}, the ${label} ${directionWord(
    result.trendDirection
  )} from ${firstValue} in ${formatMonth(
    comparison.firstMonth
  )} to ${latestValue} in ${formatMonth(
    comparison.latestMonth
  )}. ${overallChange}${latestMonthSentence}`;
}

function marketLabelText(label: string): string {
  const labels: Record<string, string> = {
    buyer_favorable: "buyer-favorable",
    seller_favorable: "seller-favorable",
    balanced: "balanced",
    mixed: "mixed",
    insufficient_data: "unclear",
  };

  return labels[label] ?? label.replaceAll("_", " ");
}

function formatCondition(
  result: Extract<MarketAnalyticsResult, { intent: "market_condition" }>
): string {
  const label = marketLabelText(
    result.classification.marketLabel
  );

  return `From ${formatPeriod(result.period)}, ${
    result.city
  } showed ${label} market conditions with ${
    result.classification.confidence
  } confidence. ${result.explanation}`;
}

/**
 * Converts a structured market analytics result into user-facing text.
 */
export function formatMarketResponse(
  result: MarketAnalyticsResult
): string {
  switch (result.intent) {
    case "market_summary":
      return formatSummary(result);

    case "market_metric":
      return formatMetric(result);

    case "market_trend":
      return formatTrend(result);

    case "market_condition":
      return formatCondition(result);

    default: {
      const exhaustiveCheck: never = result;
      throw new Error(
        `Unsupported market result: ${JSON.stringify(exhaustiveCheck)}`
      );
    }
  }
}
