import { handlePropertySearch } from "../propertySearch";

async function main() {
  const activeResponse = await handlePropertySearch(
    "Show me 3-bedroom condos in Irvine."
  );

  console.log("ACTIVE SEARCH\n");
  console.log(activeResponse);

  const soldResponse = await handlePropertySearch(
    "Find sold homes in Irvine."
  );

  console.log("\n\nSOLD SEARCH\n");
  console.log(soldResponse);
}

main().catch((error) => {
  console.error("Full search test failed:", error);
  process.exit(1);
});