import { testConnection } from "../mysql";

async function main(): Promise<void> {
  await testConnection();
}

main().catch((error: unknown) => {
  console.error("Database connection failed:", error);
  process.exit(1);
});