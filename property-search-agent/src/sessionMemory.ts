import type { ListingRow } from "./property";
import type {
  PendingField,
  SearchIntent,
} from "./parsePropertyQuery";

export interface UserSession {
  intent?: SearchIntent;

  city?: string;
  maxPrice?: number;
  minPrice?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  type?: string;
  pool?: "True";
  hasView?: "True";
  maxHOA?: number;
  months?: number;

  pendingField?: PendingField;
  lastResults?: ListingRow[];
  conversationStep: number;
}

const sessions = new Map<string, UserSession>();

export function getSession(userId: string): UserSession {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      intent: "active",
      pendingField: null,
      conversationStep: 0,
    });
  }

  return sessions.get(userId)!;
}

export function updateSession(
  userId: string,
  updates: Partial<UserSession>
): UserSession {
  const currentSession = getSession(userId);

  const updatedSession: UserSession = {
    ...currentSession,
    ...updates,
  };

  sessions.set(userId, updatedSession);

  return updatedSession;
}

export function clearSession(userId: string): void {
  sessions.delete(userId);
}
