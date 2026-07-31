import { searchActiveListings } from "../activeListings";

async function main() {
  const listings = await searchActiveListings(
    {
      city: "Irvine"
    },
    1,
    5
  );

  console.log(listings);
}

main().catch((error) => {
  console.error("Active listing test failed:", error);
  process.exit(1);
});