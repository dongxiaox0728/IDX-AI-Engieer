import { searchListings } from "./searchListings";
import { pool } from "./mysql";

async function main(): Promise<void> {
  try {
    const query = process.argv
      .slice(2)
      .join(" ")
      .trim();

    if (!query) {
      console.error(
        JSON.stringify({
          success: false,
          error: "A property search query is required.",
          usage:
            'npx tsx src/cli.ts "your property description"',
        })
      );

      process.exitCode = 1;
      return;
    }

    const results = await searchListings(
      query,
      5
    );

    const output = {
      success: true,
      query,
      count: results.length,
      results,
    };

    console.log(
      JSON.stringify(output, null, 2)
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        },
        null,
        2
      )
    );

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();