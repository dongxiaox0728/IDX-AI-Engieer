import {
  parsePropertyQuery,
  mapToDbFilters,
} from "../parsePropertyQuery";

import { searchActiveListings } from "../activeListings";

async function main() {
  const userQuery =
    "Show me 3-bedroom condos in Irvine under $1.5M with a pool.";

  console.log("1. User query:");
  console.log(userQuery);

  const parsed = await parsePropertyQuery(userQuery);

  console.log("\n2. Parsed result:");
  console.log(parsed);

  const dbFilters = mapToDbFilters(parsed);

  console.log("\n3. Database filters:");
  console.log(dbFilters);

  const listings = await searchActiveListings(
    dbFilters,
    1,
    10
  );

  console.log("\n4. Database results:");
  console.log(listings);
}

main().catch((error) => {
  console.error("Pipeline test failed:", error);
  process.exit(1);
});