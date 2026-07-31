import {
  getMarketMetric,
  MarketMetricResult,
} from "./marketMetric";
import {
  getMarketTrend,
  MarketTrendResult,
} from "./marketTrend";

export type MarketSignal =
  | "buyer_favorable"
  | "balanced"
  | "seller_favorable"
  | "mixed"
  | "insufficient_data";

export type MarketConfidence = "low" | "moderate" | "high";

export interface MarketConditionResult {
  status: "success";
  intent: "market_condition";
  city: string;
  period: {
    months: number;
    startDate: string;
    endDate: string;
  };
  indicators: {
    medianPriceChangePct: number | null;
    daysOnMarketChangePct: number | null;
    salesVolumeChangePct: number | null;
    averageListToCloseRatio: number;
  };
  signals: {
    priceSignal: MarketSignal;
    daysOnMarketSignal: MarketSignal;
    salesVolumeSignal: MarketSignal;
    negotiationSignal: MarketSignal;
  };
  classification: {
    marketLabel: MarketSignal;
    confidence: MarketConfidence;
  };
  explanation: string;
}

export interface MarketConditionDependencies {
  getTrendFn?: typeof getMarketTrend;
  getMetricFn?: typeof getMarketMetric;
}

export function classifyPriceSignal(
  changePct: number | null,
  stableThresholdPct = 1
): MarketSignal {
  if (changePct === null) return "insufficient_data";
  if (changePct > stableThresholdPct) return "seller_favorable";
  if (changePct < -stableThresholdPct) return "buyer_favorable";
  return "balanced";
}

export function classifyDaysOnMarketSignal(
  changePct: number | null,
  stableThresholdPct = 3
): MarketSignal {
  if (changePct === null) return "insufficient_data";
  if (changePct > stableThresholdPct) return "buyer_favorable";
  if (changePct < -stableThresholdPct) return "seller_favorable";
  return "balanced";
}

export function classifySalesVolumeSignal(
  changePct: number | null,
  stableThresholdPct = 3
): MarketSignal {
  if (changePct === null) return "insufficient_data";
  if (changePct > stableThresholdPct) return "seller_favorable";
  if (changePct < -stableThresholdPct) return "buyer_favorable";
  return "balanced";
}

export function classifyNegotiationSignal(
  listToCloseRatio: number
): MarketSignal {
  if (listToCloseRatio < 98) return "buyer_favorable";
  if (listToCloseRatio > 100) return "seller_favorable";
  return "balanced";
}

function classifyOverallMarket(
  signals: MarketSignal[]
): {
  marketLabel: MarketSignal;
  confidence: MarketConfidence;
} {
  const usableSignals = signals.filter(
    (signal) => signal !== "insufficient_data"
  );

  if (usableSignals.length < 2) {
    return {
      marketLabel: "insufficient_data",
      confidence: "low",
    };
  }

  const buyerCount = usableSignals.filter(
    (signal) => signal === "buyer_favorable"
  ).length;
  const sellerCount = usableSignals.filter(
    (signal) => signal === "seller_favorable"
  ).length;
  const balancedCount = usableSignals.filter(
    (signal) => signal === "balanced"
  ).length;

  const highestCount = Math.max(
    buyerCount,
    sellerCount,
    balancedCount
  );

  const winners = [
    ["buyer_favorable", buyerCount],
    ["seller_favorable", sellerCount],
    ["balanced", balancedCount],
  ].filter(([, count]) => count === highestCount);

  if (winners.length > 1) {
    return {
      marketLabel: "mixed",
      confidence: "low",
    };
  }

  const marketLabel = winners[0][0] as MarketSignal;
  const confidence: MarketConfidence =
    highestCount >= 4
      ? "high"
      : highestCount === 3
        ? "moderate"
        : "low";

  return {
    marketLabel,
    confidence,
  };
}

function buildExplanation(
  signals: MarketConditionResult["signals"],
  classification: MarketConditionResult["classification"]
): string {
  const evidence: string[] = [];

  if (signals.priceSignal === "buyer_favorable") {
    evidence.push("median prices declined");
  } else if (signals.priceSignal === "seller_favorable") {
    evidence.push("median prices increased");
  } else if (signals.priceSignal === "balanced") {
    evidence.push("median prices were relatively stable");
  }

  if (signals.daysOnMarketSignal === "buyer_favorable") {
    evidence.push("homes took longer to sell");
  } else if (signals.daysOnMarketSignal === "seller_favorable") {
    evidence.push("homes sold more quickly");
  } else if (signals.daysOnMarketSignal === "balanced") {
    evidence.push("selling time was relatively stable");
  }

  if (signals.negotiationSignal === "buyer_favorable") {
    evidence.push("homes generally closed noticeably below list price");
  } else if (signals.negotiationSignal === "seller_favorable") {
    evidence.push("homes generally closed above list price");
  } else if (signals.negotiationSignal === "balanced") {
    evidence.push("homes generally closed near list price");
  }

  if (signals.salesVolumeSignal === "buyer_favorable") {
    evidence.push("sales activity declined");
  } else if (signals.salesVolumeSignal === "seller_favorable") {
    evidence.push("sales activity increased");
  } else if (signals.salesVolumeSignal === "balanced") {
    evidence.push("sales activity was relatively stable");
  }

  const evidenceText =
    evidence.length > 0
      ? evidence.join(", ")
      : "the available indicators were limited";

  if (classification.marketLabel === "buyer_favorable") {
    return `Conditions appear more favorable to buyers because ${evidenceText}.`;
  }

  if (classification.marketLabel === "seller_favorable") {
    return `Conditions appear more favorable to sellers because ${evidenceText}.`;
  }

  if (classification.marketLabel === "balanced") {
    return `The market appears relatively balanced because ${evidenceText}.`;
  }

  if (classification.marketLabel === "mixed") {
    return `The market shows mixed conditions: ${evidenceText}.`;
  }

  return "There is not enough reliable data to classify the current market condition.";
}

/**
 * Combines four indicators to produce a cautious buyer/seller market
 * interpretation. This is a descriptive signal, not financial advice.
 */
export async function getMarketCondition(
  city: string,
  dependencies: MarketConditionDependencies = {}
): Promise<MarketConditionResult> {
  const getTrendFn = dependencies.getTrendFn ?? getMarketTrend;
  const getMetricFn = dependencies.getMetricFn ?? getMarketMetric;

  const [
    priceTrend,
    daysOnMarketTrend,
    salesVolumeTrend,
    listToCloseMetric,
  ] = await Promise.all([
    getTrendFn(city, "median_close_price"),
    getTrendFn(city, "average_days_on_market"),
    getTrendFn(city, "sold_count"),
    getMetricFn(city, "average_list_to_close_ratio"),
  ]);

  const signals: MarketConditionResult["signals"] = {
    priceSignal: classifyPriceSignal(
      priceTrend.comparison.overallChangePct
    ),
    daysOnMarketSignal: classifyDaysOnMarketSignal(
      daysOnMarketTrend.comparison.overallChangePct
    ),
    salesVolumeSignal: classifySalesVolumeSignal(
      salesVolumeTrend.comparison.overallChangePct
    ),
    negotiationSignal: classifyNegotiationSignal(
      listToCloseMetric.metric.value
    ),
  };

  const classification = classifyOverallMarket(
    Object.values(signals)
  );

  return {
    status: "success",
    intent: "market_condition",
    city: priceTrend.city,
    period: priceTrend.period,
    indicators: {
      medianPriceChangePct:
        priceTrend.comparison.overallChangePct,
      daysOnMarketChangePct:
        daysOnMarketTrend.comparison.overallChangePct,
      salesVolumeChangePct:
        salesVolumeTrend.comparison.overallChangePct,
      averageListToCloseRatio:
        listToCloseMetric.metric.value,
    },
    signals,
    classification,
    explanation: buildExplanation(signals, classification),
  };
}
