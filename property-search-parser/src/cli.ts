import { handlePropertySearch } from "./propertySearch";
import { pool } from "./mysql";

async function main(): Promise<void> {
  const userQuery = process.argv.slice(2).join(" ").trim();

  if (!userQuery) {
    console.error("Please provide a property-search query.");
    process.exitCode = 1;
    return;
  }

  try {
    const response = await handlePropertySearch(userQuery);
    console.log(response);
  } catch (error: unknown) {
    console.error("Property search failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Unexpected CLI error:", error);
  process.exitCode = 1;
});