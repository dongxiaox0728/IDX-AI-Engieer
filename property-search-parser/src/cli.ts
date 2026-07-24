import * as readline from "node:readline";

import { pool } from "./mysql";
import { propertySearchSkill } from "./propertySearchSkill";

type OpenClawChannelContext = {
  senderId?: string;
  userId?: string;
  peerId?: string;
  channelId?: string;
  accountId?: string;
  provider?: string;
  from?: string;
};

/**
 * Returns a stable session identifier.
 *
 * Locally, this falls back to "local-test-user".
 * When OpenClaw launches the process, it attempts to read the sender identity
 * from OPENCLAW_CHANNEL_CONTEXT.
 */
function getSessionUserId(): string {
  const rawContext = process.env.OPENCLAW_CHANNEL_CONTEXT;

  if (!rawContext) {
    return "local-test-user";
  }

  try {
    const context = JSON.parse(
      rawContext
    ) as OpenClawChannelContext;

    return (
      context.senderId ??
      context.userId ??
      context.peerId ??
      context.from ??
      context.channelId ??
      "local-test-user"
    );
  } catch (error: unknown) {
    console.error(
      "Could not parse OPENCLAW_CHANNEL_CONTEXT:",
      error
    );

    return "local-test-user";
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const userId = getSessionUserId();
let isClosing = false;

console.log("Conversational Property Search");
console.log('Type "reset" to clear the session or "exit" to quit.');
console.log(`Session user ID: ${userId}`);

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

    if (normalizedQuery === "exit" || normalizedQuery === "quit") {
      await closeCli();
      return;
    }

    try {
      const result = await propertySearchSkill({
        query,
        userId,
      });

      console.log(`Agent: ${result.response}`);
    } catch (error: unknown) {
      console.error("Property search failed:", error);
    }

    if (!isClosing) {
      askForMessage();
    }
  });
}

process.on("SIGINT", () => {
  void closeCli();
});

askForMessage();
