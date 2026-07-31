import { answerMarketQuestion } from "../src/answerMarketQuestion";
import { getSupportedMarketCities } from "../src/marketCities";
import { pool, testConnection } from "../src/mysql";

const PREFERRED_TEST_CITIES = [
  "San Diego",
  "Los Angeles",
  "Sacramento",
  "Irvine",
  "Pasadena",
];

function chooseTestCity(supportedCities: string[]): string {
  for (const preferredCity of PREFERRED_TEST_CITIES) {
    const match = supportedCities.find(
      (city) =>
        city.toLocaleLowerCase("en-US") ===
        preferredCity.toLocaleLowerCase("en-US")
    );

    if (match) {
      return match;
    }
  }

  const fallback = supportedCities[0];

  if (!fallback) {
    throw new Error(
      "No city is available for the live market analytics test."
    );
  }

  return fallback;
}

async function runLiveMarketTest(): Promise<void> {
  console.log("Testing MySQL connection...");
  await testConnection();

  const supportedCities =
    await getSupportedMarketCities(true);

  console.log(
    `Loaded ${supportedCities.length} supported cities from california_sold.`
  );

  const city = chooseTestCity(supportedCities);
  console.log(`Using ${city} for the live test.\n`);

  const questions = [
    `How is the ${city} housing market?`,
    `What is the average home price in ${city}?`,
    `Are home prices increasing in ${city}?`,
    `Is ${city} a buyer's market?`,
  ];

  let failureCount = 0;

  for (const [index, question] of questions.entries()) {
    console.log(`${index + 1}. Question: ${question}`);

    try {
      const answer = await answerMarketQuestion(question, {
        supportedCities,
      });

      console.log(`Answer: ${answer}\n`);
    } catch (error) {
      failureCount += 1;
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(`FAILED: ${message}\n`);
    }
  }

  if (failureCount > 0) {
    throw new Error(
      `${failureCount} live market analytics test(s) failed.`
    );
  }

  console.log("All live market analytics tests passed.");
}

runLiveMarketTest()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : error
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
