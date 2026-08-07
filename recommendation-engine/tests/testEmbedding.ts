import { getEmbedding } from "../src/embeddingClient";

async function main(): Promise<void> {
  try {
    const embedding = await getEmbedding(
      "A midcentury modern home with mountain views and architectural character."
    );

    console.log("Embedding created successfully.");
    console.log(`Vector length: ${embedding.length}`);
    console.log("First 10 values:");
    console.log(embedding.slice(0, 10));
  } catch (error) {
    console.error("Embedding test failed:");

    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }

    process.exitCode = 1;
  }
}

main();