import fs from "node:fs/promises";
import path from "node:path";

import { getEmbedding } from "./embeddingClient";
import { cosineSimilarity } from "./cosineSimilarity";

import type { ListingEmbedding } from "./types";

interface SemanticSearchResult {
  listingId: string;
  text: string;
  score: number;
}

const EMBEDDING_FILE = path.resolve(
  process.cwd(),
  "data",
  "listing_embeddings.json"
);

async function loadListingEmbeddings(): Promise<ListingEmbedding[]> {
  const fileContent = await fs.readFile(
    EMBEDDING_FILE,
    "utf8"
  );

  return JSON.parse(fileContent) as ListingEmbedding[];
}

export async function semanticSearch(
  query: string,
  topK = 5
): Promise<SemanticSearchResult[]> {
  const cleanedQuery = query.trim();

  if (!cleanedQuery) {
    throw new Error("Search query cannot be empty.");
  }

  const listingEmbeddings =
    await loadListingEmbeddings();

  if (listingEmbeddings.length === 0) {
    throw new Error(
      "No listing embeddings were found."
    );
  }

  // Create an embedding for the user's query
  const queryEmbedding =
    await getEmbedding(cleanedQuery);

  // Compare query embedding with every listing
  const scoredListings =
    listingEmbeddings.map((listing) => {
      const score = cosineSimilarity(
        queryEmbedding,
        listing.embedding
      );

      return {
        listingId: listing.listingId,
        text: listing.text,
        score,
      };
    });

  // Sort highest similarity first
  scoredListings.sort(
    (a, b) => b.score - a.score
  );

  // Return only the top results
  return scoredListings.slice(0, topK);
}