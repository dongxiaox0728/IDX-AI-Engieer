import { getActiveListings } from "../src/getActiveListings";
import { pool } from "../src/mysql";

async function main(): Promise<void> {
  try {
    const listings = await getActiveListings(20);

    console.log(`Retrieved ${listings.length} active listings.\n`);

    listings.forEach((listing, index) => {
      console.log(`Listing ${index + 1}`);
      console.log(`ID: ${listing.listingId}`);
      console.log(`Type: ${listing.propertyType}`);
      console.log(`City: ${listing.city}`);
      console.log(`Bedrooms: ${listing.bedrooms}`);
      console.log(`Half bathrooms: ${listing.halfBathrooms}`);
      console.log(`Lot size: ${listing.lotSizeSquareFeet}`);
      console.log(`Year built: ${listing.yearBuilt}`);
      console.log(`Price: ${listing.price}`);
      console.log(
        `Remarks: ${listing.remarks?.slice(0, 200) ?? "No remarks"}`
      );
      console.log("--------------------------------------");
    });
  } catch (error) {
    console.error("Failed to retrieve listings:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();