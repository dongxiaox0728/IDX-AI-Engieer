import fs from "node:fs/promises";
import path from "node:path";

import { getActiveListings } from "./getActiveListings";
import { buildListingText } from "./listingText";
import { getEmbedding } from "./embeddingClient";
import { pool } from "./mysql";

import type { ListingEmbedding } from "./types";

const OUTPUT_FILE = path.resolve(
  process.cwd(),
  "data",
  "listing_embeddings.json"
);

async function buildListingEmbeddings(): Promise<void> {
  // Start with 10 for testing.
  const listings = await getActiveListings(10);

  if (listings.length === 0) {
    throw new Error("No active listings were returned from MySQL.");
  }

  console.log(
    `Starting embedding generation for ${listings.length} listings.`
  );

  const results: ListingEmbedding[] = [];

  for (let index = 0; index < listings.length; index += 1) {
    const listing = listings[index];
    const listingText = buildListingText(listing);

    console.log(
      `[${index + 1}/${listings.length}] Embedding listing ${listing.listingId}`
    );

    try {
      const embedding = await getEmbedding(listingText);

      results.push({
        listingId: listing.listingId,
        text: listingText,
        embedding,
      });
    } catch (error) {
      console.error(
        `Failed to embed listing ${listing.listingId}:`
      );

      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error(error);
      }
    }
  }

  await fs.mkdir(path.dirname(OUTPUT_FILE), {
    recursive: true,
  });

  await fs.writeFile(
    OUTPUT_FILE,
    JSON.stringify(results),
    "utf8"
  );

  console.log();
  console.log(
    `Saved ${results.length} listing embeddings to:`
  );
  console.log(OUTPUT_FILE);
}

buildListingEmbeddings()
  .catch((error) => {
    console.error("Embedding generation failed:");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });