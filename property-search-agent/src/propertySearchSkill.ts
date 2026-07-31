import type { PropertyFilter } from "./parsePropertyQuery";

import { handleConversation } from "./conversationManager";
import { handleParsedPropertySearch } from "./propertySearch";
import { updateSession } from "./sessionMemory";

export type PropertySearchSkillInput = {
  query: string;
  userId: string;
};

export type PropertySearchSkillResult = {
  status: "question" | "search" | "reset";
  response: string;
};

/**
 * Multi-turn property-search skill.
 *
 * A stable userId must be passed for every message from the same user.
 * For WhatsApp, use the sender's phone number or sender ID.
 */
export async function propertySearchSkill(
  input: PropertySearchSkillInput
): Promise<PropertySearchSkillResult> {
  const query = input.query?.trim();
  const userId = input.userId?.trim();

  if (!query) {
    return {
      status: "question",
      response: "Please enter a property search request.",
    };
  }

  if (!userId) {
    throw new Error(
      "propertySearchSkill requires a stable userId."
    );
  }

  try {
    const conversation = await handleConversation(
      userId,
      query
    );

    if (
      conversation.status === "question" ||
      conversation.status === "reset"
    ) {
      return {
        status: conversation.status,
        response: conversation.message,
      };
    }

    const session = conversation.session;

    /*
     * Convert the accumulated session into the PropertyFilter format
     * expected by propertySearch.ts.
     *
     * Add other session fields here if your UserSession interface contains
     * them.
     */
    const parsedFilters: PropertyFilter = {
      intent: session.intent ?? "active",
      city: session.city ?? null,
      maxPrice: session.maxPrice ?? null,
      beds: session.beds ?? null,
      baths: session.baths ?? null,
      sqft: session.sqft ?? null,
      type: session.type ?? null,
      pool: session.pool ?? null,
      hasView: session.hasView ?? null,
      maxHOA: session.maxHOA ?? null,
      months: session.months ?? null,
    };

    const response = await handleParsedPropertySearch(
      parsedFilters
    );

    updateSession(userId, {
      pendingField: null,
    });

    return {
      status: "search",
      response,
    };
  } catch (error) {
    console.error("Property search skill failed:", error);

    return {
      status: "question",
      response:
        "I had trouble processing your property search. Please try again.",
    };
  }
}
