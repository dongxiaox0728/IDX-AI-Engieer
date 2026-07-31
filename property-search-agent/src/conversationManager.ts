import { parsePropertyQuery } from "./parsePropertyQuery";

import {
  clearSession,
  getSession,
  updateSession,
  type UserSession,
} from "./sessionMemory";

export interface ConversationResponse {
  status: "question" | "search" | "reset";
  message: string;
  session: UserSession;
}

export async function handleConversation(
  userId: string,
  userMessage: string
): Promise<ConversationResponse> {
  const normalizedMessage = userMessage.trim().toLowerCase();

  if (
    normalizedMessage === "reset" ||
    normalizedMessage === "start over" ||
    normalizedMessage === "clear"
  ) {
    clearSession(userId);

    const resetSession = updateSession(userId, {
      pendingField: "city",
    });

    return {
      status: "reset",
      message:
        "Your previous search has been cleared. What city are you interested in?",
      session: resetSession,
    };
  }

  const currentSession = getSession(userId);

  // Pass pendingField so short replies such as "Irvine", "1.2M",
  // "single family", and "3" can be interpreted correctly.
  const parsedQuery = await parsePropertyQuery(
    userMessage,
    currentSession.pendingField ?? null
  );

  const updates: Partial<UserSession> = {
    pendingField: null,
    conversationStep: currentSession.conversationStep + 1,
  };

  // Do not overwrite a saved sold intent with "active" on a short follow-up.
  if (
    parsedQuery.intent === "sold" ||
    currentSession.conversationStep === 0
  ) {
    updates.intent = parsedQuery.intent;
  }

  if (parsedQuery.city !== null) {
    updates.city = parsedQuery.city;
  }

  if (parsedQuery.maxPrice !== null) {
    updates.maxPrice = parsedQuery.maxPrice;
  }

  if (parsedQuery.beds !== null) {
    updates.beds = parsedQuery.beds;
  }

  if (parsedQuery.baths !== null) {
    updates.baths = parsedQuery.baths;
  }

  if (parsedQuery.sqft !== null) {
    updates.sqft = parsedQuery.sqft;
  }

  if (parsedQuery.type !== null) {
    updates.type = parsedQuery.type;
  }

  if (parsedQuery.pool !== null) {
    updates.pool = parsedQuery.pool;
  }

  if (parsedQuery.hasView !== null) {
    updates.hasView = parsedQuery.hasView;
  }

  if (parsedQuery.maxHOA !== null) {
    updates.maxHOA = parsedQuery.maxHOA;
  }

  if (parsedQuery.months !== null) {
    updates.months = parsedQuery.months;
  }

  let session = updateSession(userId, updates);

  if (!session.city) {
    session = updateSession(userId, {
      pendingField: "city",
    });

    return {
      status: "question",
      message: "What city would you like to search in?",
      session,
    };
  }

  // Sold-comparable searches only require a city.
  if (session.intent === "sold") {
    return {
      status: "search",
      message: "Searching for recently sold properties.",
      session,
    };
  }

  if (!session.maxPrice) {
    session = updateSession(userId, {
      pendingField: "maxPrice",
    });

    return {
      status: "question",
      message: "What is your maximum budget?",
      session,
    };
  }

  if (!session.type) {
    session = updateSession(userId, {
      pendingField: "type",
    });

    return {
      status: "question",
      message:
        "What property type do you prefer—single family, condo, or townhome?",
      session,
    };
  }

  if (!session.beds) {
    session = updateSession(userId, {
      pendingField: "beds",
    });

    return {
      status: "question",
      message: "How many bedrooms do you need?",
      session,
    };
  }

  return {
    status: "search",
    message: "Searching for matching properties now.",
    session,
  };
}
