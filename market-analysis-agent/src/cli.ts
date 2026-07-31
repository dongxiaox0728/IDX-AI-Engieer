import * as readline from "node:readline";

import { answerMarketQuestion } from "./answerMarketQuestion";
import { getSupportedMarketCities } from "./marketCities";
import { pool } from "./mysql";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let isClosing = false;
let supportedCities: string[] = [];

console.log("California Market Analytics");
console.log('Type "exit" or "quit" to close the program.');

async function closeCli(): Promise<void> {
  if (isClosing) {
    return;
  }

  isClosing = true;
  rl.close();

  try {
    await pool.end();
  } catch (error: unknown) {
    console.error("Failed to close the database pool:", error);
  }
}

function askForMessage(): void {
  rl.question("\nYou: ", async (query) => {
    const normalizedQuery = query.trim().toLowerCase();

    if (
      normalizedQuery === "exit" ||
      normalizedQuery === "quit"
    ) {
      await closeCli();
      return;
    }

    if (!normalizedQuery) {
      console.log("Agent: Please enter a market question.");
    } else {
      try {
        const response = await answerMarketQuestion(query, {
          supportedCities,
        });

        console.log(`Agent: ${response}`);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        console.error(`Request failed: ${message}`);
      }
    }

    if (!isClosing) {
      askForMessage();
    }
  });
}

async function startCli(): Promise<void> {
  try {
    supportedCities = await getSupportedMarketCities();

    console.log(
      `Loaded ${supportedCities.length} cities for market analytics.`
    );

    askForMessage();
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(`Failed to start CLI: ${message}`);
    await closeCli();
    process.exitCode = 1;
  }
}

process.on("SIGINT", () => {
  void closeCli();
});

void startCli();
