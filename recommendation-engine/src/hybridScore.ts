import { cosineSimilarity } from "./cosineSimilarity";
import type { PropertyListing } from "./types";

export function calculateHybridScore(
  target: PropertyListing,
  candidate: PropertyListing,
  targetEmbedding: number[],
  candidateEmbedding: number[]
): number {
  let score = 0;

  // 1. Price similarity: max 20 points
  if (
    target.price !== null &&
    candidate.price !== null
  ) {
    const priceDifference = Math.abs(
      target.price - candidate.price
    );

    if (priceDifference < 50000) {
      score += 20;
    } else if (priceDifference < 150000) {
      score += 12;
    } else if (priceDifference < 300000) {
      score += 5;
    }
  }

  // 2. Property type match: 15 points
  if (
    target.propertyType &&
    candidate.propertyType &&
    target.propertyType === candidate.propertyType
  ) {
    score += 15;
  }

  // 3. City match: 15 points
  if (
    target.city &&
    candidate.city &&
    target.city === candidate.city
  ) {
    score += 15;
  }

  // 4. Living-area similarity: max 10 points
  if (
    target.squareFeet !== null &&
    candidate.squareFeet !== null
  ) {
    const sizeDifference = Math.abs(
      target.squareFeet -
      candidate.squareFeet
    );

    if (sizeDifference < 300) {
      score += 10;
    } else if (sizeDifference < 700) {
      score += 5;
    }
  }

  // 5. Semantic similarity: max 40 points
  const semanticSimilarity =
    cosineSimilarity(
      targetEmbedding,
      candidateEmbedding
    );

  score += semanticSimilarity * 40;

  // Round to 2 decimal places
  return Math.round(score * 100) / 100;
}