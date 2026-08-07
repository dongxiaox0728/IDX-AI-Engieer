import { recommendListings } from "../src/recommendListings";
import { pool } from "../src/mysql";

async function main(): Promise<void> {
  try {
    // IMPORTANT:
    // This ID must be one of the 10 listings
    // already stored in listing_embeddings.json.
    const targetListingId = "1118391819";

    const recommendations =
      await recommendListings(
        targetListingId,
        5
      );

    console.log(
      `\nTarget listing: ${targetListingId}`
    );

    console.log(
      `Recommendations found: ${recommendations.length}\n`
    );

    recommendations.forEach(
      (listing, index) => {
        console.log(
          `${index + 1}. Listing ${listing.listingId}`
        );

        console.log(
          `Score: ${listing.similarityScore}`
        );

        console.log(
          `City: ${listing.city}`
        );

        console.log(
          `Type: ${listing.propertyType}`
        );

        console.log(
          `Price: $${listing.price}`
        );

        console.log(
          `Year built: ${listing.yearBuilt}`
        );

        console.log(
          `Remarks: ${listing.remarks}`
        );

        console.log(
          "----------------------------------"
        );
      }
    );
  } catch (error) {
    console.error("Recommendation test failed:");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();