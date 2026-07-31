import {
  MarketAnalyticsDependencies,
} from "./marketAnalytics";
import { formatMarketResponse } from "./marketResponseFormatter";
import { getSupportedMarketCities } from "./marketCities";
import { runMarketAnalytics } from "./runMarketAnalytics";

export interface AnswerMarketQuestionOptions {
  /**
   * Optional city list for tests or callers that already loaded it.
   * When omitted, cities are loaded from california_sold.
   */
  supportedCities?: string[];

  /**
   * Optional injected analytics functions, mainly for unit testing.
   */
  analyticsDependencies?: MarketAnalyticsDependencies;

  /**
   * Optional city loader, mainly for unit testing.
   */
  cityLoader?: () => Promise<string[]>;
}

/**
 * Accepts a natural-language market question and returns a readable answer.
 *
 * Full flow:
 * question -> parser -> router -> analytics -> formatter
 */
export async function answerMarketQuestion(
  question: string,
  options: AnswerMarketQuestionOptions = {}
): Promise<string> {
  const cityLoader =
    options.cityLoader ?? getSupportedMarketCities;

  const supportedCities =
    options.supportedCities ?? (await cityLoader());

  if (supportedCities.length === 0) {
    throw new Error(
      "No supported cities were found in california_sold."
    );
  }

  const result = await runMarketAnalytics(question, {
    supportedCities,
    analyticsDependencies: options.analyticsDependencies,
  });

  return formatMarketResponse(result);
}
