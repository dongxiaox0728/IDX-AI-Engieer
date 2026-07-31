import {
  MarketRequest,
} from "./marketAnalytics";
import {
  MarketMetricName,
} from "./marketMetric";
import {
  MarketTrendMetric,
} from "./marketTrend";

export interface ParseMarketQueryOptions {
  supportedCities: string[];
}

const CONDITION_PATTERNS = [
  /\bbuyer(?:'s|s)? market\b/i,
  /\bseller(?:'s|s)? market\b/i,
  /\bgood time to buy\b/i,
  /\bgood time to sell\b/i,
  /\bfavor(?:s|ing)? buyers\b/i,
  /\bfavor(?:s|ing)? sellers\b/i,
  /\bnegotiating power\b/i,
  /\bmarket condition\b/i,
];

const TREND_PATTERNS = [
  /\btrend\b/i,
  /\bover time\b/i,
  /\bchanged?\b/i,
  /\bchanging\b/i,
  /\bincreas(?:e|ed|ing)\b/i,
  /\bdecreas(?:e|ed|ing)\b/i,
  /\bgoing up\b/i,
  /\bgoing down\b/i,
  /\brising\b/i,
  /\bfalling\b/i,
  /\bfaster\b/i,
  /\bslower\b/i,
  /\blonger to sell\b/i,
  /\bshorter to sell\b/i,
];

const SUMMARY_PATTERNS = [
  /\bmarket summary\b/i,
  /\bmarket overview\b/i,
  /\bhow is (?:the )?.*market\b/i,
  /\bwhat does (?:the )?.*market look like\b/i,
  /\bhow is housing\b/i,
];

const METRIC_PATTERNS: Array<{
  metric: MarketMetricName;
  patterns: RegExp[];
}> = [
  {
    metric: "average_price_per_sqft",
    patterns: [
      /\baverage price per square foot\b/i,
      /\baverage price per sqft\b/i,
      /\bprice per square foot\b/i,
      /\bprice per sqft\b/i,
      /\bppsf\b/i,
    ],
  },
  {
    metric: "average_list_to_close_ratio",
    patterns: [
      /\blist[- ]to[- ]close ratio\b/i,
      /\bclose[- ]to[- ]list ratio\b/i,
      /\bsale[- ]to[- ]list ratio\b/i,
      /\bpercent of list price\b/i,
    ],
  },
  {
    metric: "average_days_on_market",
    patterns: [
      /\baverage days on market\b/i,
      /\bdays on market\b/i,
      /\bhow long .* (?:stay|stays|remain|remains) on the market\b/i,
      /\bhow long .* take to sell\b/i,
      /\bdom\b/i,
    ],
  },
  {
    metric: "median_close_price",
    patterns: [
      /\bmedian (?:close |sale |sold |home )?price\b/i,
      /\bmedian price\b/i,
    ],
  },
  {
    metric: "average_close_price",
    patterns: [
      /\baverage (?:close |sale |sold |home )?price\b/i,
      /\bmean (?:close |sale |sold |home )?price\b/i,
      /\baverage price\b/i,
    ],
  },
  {
    metric: "sold_count",
    patterns: [
      /\bnumber of (?:homes|houses|properties) sold\b/i,
      /\bhow many (?:homes|houses|properties) sold\b/i,
      /\bsales count\b/i,
      /\bsold count\b/i,
      /\bsales volume\b/i,
    ],
  },
];

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findCity(
  question: string,
  supportedCities: string[]
): string | null {
  const normalizedQuestion = normalizeText(question);

  const matches = supportedCities
    .map((city) => normalizeText(city))
    .filter(Boolean)
    .filter((city) => {
      const cityPattern = new RegExp(
        `\\b${escapeRegExp(city).replace(/\s+/g, "\\s+")}\\b`,
        "i"
      );
      return cityPattern.test(normalizedQuestion);
    })
    .sort((a, b) => b.length - a.length);

  return matches[0] ?? null;
}

function detectMetric(
  question: string
): MarketMetricName | null {
  for (const definition of METRIC_PATTERNS) {
    if (
      definition.patterns.some((pattern) =>
        pattern.test(question)
      )
    ) {
      return definition.metric;
    }
  }

  return null;
}

function detectTrendMetric(
  question: string,
  detectedMetric: MarketMetricName | null
): MarketTrendMetric {
  if (
    detectedMetric === "average_days_on_market" ||
    /\b(?:faster|slower|longer|shorter).*sell\b/i.test(question)
  ) {
    return "average_days_on_market";
  }

  if (
    detectedMetric === "sold_count" ||
    /\bsales volume\b/i.test(question)
  ) {
    return "sold_count";
  }

  if (detectedMetric === "average_close_price") {
    return "average_close_price";
  }

  return "median_close_price";
}

function matchesAny(
  question: string,
  patterns: RegExp[]
): boolean {
  return patterns.some((pattern) => pattern.test(question));
}

/**
 * Converts a natural-language market question into a MarketRequest.
 *
 * Priority:
 * 1. market_condition
 * 2. market_trend
 * 3. market_metric
 * 4. market_summary
 */
export function parseMarketQuery(
  question: string,
  options: ParseMarketQueryOptions
): MarketRequest {
  const normalizedQuestion = normalizeText(question);

  if (!normalizedQuestion) {
    throw new Error("A market question is required.");
  }

  if (
    !options.supportedCities ||
    options.supportedCities.length === 0
  ) {
    throw new Error(
      "At least one supported city is required to parse a market query."
    );
  }

  const city = findCity(
    normalizedQuestion,
    options.supportedCities
  );

  if (!city) {
    throw new Error(
      "No supported city was found in the market question."
    );
  }

  const detectedMetric = detectMetric(normalizedQuestion);

  if (
    matchesAny(normalizedQuestion, CONDITION_PATTERNS)
  ) {
    return {
      intent: "market_condition",
      city,
    };
  }

  if (matchesAny(normalizedQuestion, TREND_PATTERNS)) {
    return {
      intent: "market_trend",
      city,
      metric: detectTrendMetric(
        normalizedQuestion,
        detectedMetric
      ),
    };
  }

  if (detectedMetric) {
    return {
      intent: "market_metric",
      city,
      metric: detectedMetric,
    };
  }

  if (
    matchesAny(normalizedQuestion, SUMMARY_PATTERNS) ||
    /\b(?:housing|real estate|property) market\b/i.test(
      normalizedQuestion
    )
  ) {
    return {
      intent: "market_summary",
      city,
    };
  }

  throw new Error(
    "The question does not match a supported market-analysis type."
  );
}
