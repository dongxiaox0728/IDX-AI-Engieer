import { getListingById } from "./getListingsByIds";
import { getCandidateListings } from "./getCandidateListings";
import { getEmbeddingByListingId } from "./embeddingStore";
import { calculateHybridScore } from "./hybridScore";
import {
  validateWithComps,
  type CompValidationResult,
} from "./validateWithComps";

import type { PropertyListing } from "./types";

interface ScoredCandidate extends PropertyListing {
  similarityScore: number;
}

export interface RecommendationResult extends PropertyListing {
  similarityScore: number;
  compValidation: CompValidationResult | null;
}

export async function recommendListings(
  targetListingId: string,
  topK = 5
): Promise<RecommendationResult[]> {
  const cleanedTargetId = targetListingId.trim();

  if (!cleanedTargetId) {
    throw new Error("Target listing ID cannot be empty.");
  }

  if (!Number.isInteger(topK) || topK <= 0) {
    throw new Error("topK must be a positive integer.");
  }

  // 1. Get the property selected by the user
  const targetListing =
    await getListingById(cleanedTargetId);

  if (!targetListing) {
    throw new Error(
      `Target listing ${cleanedTargetId} was not found.`
    );
  }

  // 2. Get its saved embedding
  const targetEmbedding =
    await getEmbeddingByListingId(cleanedTargetId);

  if (!targetEmbedding) {
    throw new Error(
      `No embedding was found for target listing ${cleanedTargetId}.`
    );
  }

  // 3. Get all other active listings
  const candidates =
    await getCandidateListings(cleanedTargetId);

  console.log(
    `Total active candidates: ${candidates.length}`
  );

  const scoredCandidates: ScoredCandidate[] = [];

  let candidatesWithEmbeddings = 0;

  // 4. Calculate the hybrid score for each candidate
  for (const candidate of candidates) {
    const candidateEmbedding =
      await getEmbeddingByListingId(
        candidate.listingId
      );

    // During testing, only some listings have embeddings.
    if (!candidateEmbedding) {
      continue;
    }

    candidatesWithEmbeddings++;

    const similarityScore =
      calculateHybridScore(
        targetListing,
        candidate,
        targetEmbedding,
        candidateEmbedding
      );

    scoredCandidates.push({
      ...candidate,
      similarityScore,
    });
  }

  console.log(
    `Candidates with embeddings: ${candidatesWithEmbeddings}`
  );

  // 5. Rank candidates from most similar to least similar
  scoredCandidates.sort(
    (a, b) =>
      b.similarityScore - a.similarityScore
  );

  // 6. Keep only the top recommendations
  const topCandidates =
    scoredCandidates.slice(0, topK);

  // 7. Validate each top recommendation
  // using recent sold comparable properties
  const finalResults: RecommendationResult[] = [];

  for (const candidate of topCandidates) {
    let compValidation: CompValidationResult | null =
      null;

    if (
      candidate.city &&
      candidate.squareFeet !== null &&
      candidate.squareFeet > 0 &&
      candidate.price !== null &&
      candidate.price > 0
    ) {
      try {
        compValidation =
          await validateWithComps(
            candidate.city,
            candidate.squareFeet,
            candidate.price
          );
      } catch (error) {
        console.error(
          `Comp validation failed for listing ${candidate.listingId}:`
        );

        if (error instanceof Error) {
          console.error(error.message);
        } else {
          console.error(error);
        }
      }
    }

    finalResults.push({
      ...candidate,
      compValidation,
    });
  }

  return finalResults;
}