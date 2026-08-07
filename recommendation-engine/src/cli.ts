import { recommendListings } from "./recommendListings";
import { pool } from "./mysql";

async function main(): Promise<void> {
  try {
    // Everything after "src/cli.ts" becomes CLI arguments.
    const args = process.argv.slice(2);

    const targetListingId = args[0]?.trim();

    if (!targetListingId) {
      console.error(
        JSON.stringify(
          {
            success: false,
            error: "A target listing ID is required.",
            usage: "npx tsx src/cli.ts <listingId>",
          },
          null,
          2
        )
      );

      process.exitCode = 1;
      return;
    }

    // Return the top 5 recommendations
    const recommendations =
      await recommendListings(
        targetListingId,
        5
      );

    const output = {
      success: true,
      targetListingId,
      count: recommendations.length,
      recommendations,
    };

    console.log(
      JSON.stringify(
        output,
        null,
        2
      )
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