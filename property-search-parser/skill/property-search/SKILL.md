# Conversational Property Search

## Description

A multi-turn property-search skill that remembers a user's preferences during a session, asks follow-up questions, progressively refines the search, and returns matching listings.

## Inputs

- `query`: The user's current property-search message.
- `userId`: A stable identifier for the user. For WhatsApp, use the sender or peer ID supplied by the channel integration.

## Behavior

1. Parse property preferences from the current message.
2. Merge newly detected preferences with the user's saved session.
3. Ask a follow-up question when required information is missing.
4. Search listings when the city, maximum budget, property type, and bedroom count are available.
5. Preserve prior preferences when the user refines the search.
6. Clear the session when the user says `reset`, `clear`, or `start over`.
7. Return the final response text produced by `propertySearchSkill`.

## Local execution

From the `property-search-parser` directory, run:

```powershell
npx tsx .\src\cli.ts
```

Local runs use this fallback session ID:

```text
local-test-user
```

The CLI remains open so multiple messages share the same in-memory session.

## OpenClaw / WhatsApp session identity

The CLI attempts to read the channel context from:

```text
OPENCLAW_CHANNEL_CONTEXT
```

When that environment variable contains JSON channel metadata, the CLI tries these fields in order:

1. `senderId`
2. `userId`
3. `peerId`
4. `from`
5. `channelId`

The selected value is passed to the skill as:

```ts
const result = await propertySearchSkill({
  query: incomingMessageText,
  userId: stableSenderId,
});

return result.response;
```

The same WhatsApp sender must receive the same `userId` on every turn. Do not use a timestamp, random value, or per-message ID.

If the installed OpenClaw integration exposes its sender identity under a different field or environment variable, update `getSessionUserId()` in `src/cli.ts` to match the actual channel payload.

## Example conversation

User: Find me homes

Agent: What city would you like to search in?

User: Irvine

Agent: What is your maximum budget?

User: 1.2M

Agent: What property type do you prefer—single family, condo, or townhome?

User: Single family

Agent: How many bedrooms do you need?

User: 3

Agent: Returns matching listings.

## Refinement example

User: Only show homes with a pool

Agent: Runs the search again while preserving the existing city, budget, property type, and bedroom requirement.

## Reset example

User: reset

Agent: Your previous search has been cleared. What city are you interested in?

## Important limitation

The current session store uses an in-memory `Map`. It persists only while the Node.js process remains running. If OpenClaw starts a new process for every WhatsApp message, session memory must instead be stored in MySQL, a JSON file, Redis, or another persistent store.
