import {
  handleMarketRequest,
  MarketAnalyticsDependencies,
  MarketAnalyticsResult,
} from "./marketAnalytics";
import { parseMarketQuery } from "./parseMarketQuery";

export interface RunMarketAnalyticsOptions {
  supportedCities: string[];
  analyticsDependencies?: MarketAnalyticsDependencies;
}

/**
 * Runs the complete market-analytics flow:
 *
 * 1. Parse the natural-language question into a MarketRequest.
 * 2. Route the request to the correct analytics function.
 * 3. Return the structured analytics result.
 *
 * This function does not format the result into a user-facing sentence.
 * That responsibility belongs to the response formatter added later.
 */
export async function runMarketAnalytics(
  question: string,
  options: RunMarketAnalyticsOptions
): Promise<MarketAnalyticsResult> {
  if (!options) {
    throw new Error("Market analytics options are required.");
  }

  if (
    !Array.isArray(options.supportedCities) ||
    options.supportedCities.length === 0
  ) {
    throw new Error(
      "At least one supported city is required to run market analytics."
    );
  }

  const request = parseMarketQuery(question, {
    supportedCities: options.supportedCities,
  });

  return handleMarketRequest(
    request,
    options.analyticsDependencies
  );
}
