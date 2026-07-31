---
name: property-search-agent
description: Search active California listings and sold comps with multi-turn property preferences.
---

# Property Search Agent

Use this skill when a user wants to find properties, active listings, or sold comparables using listing filters.

This is separate from market analytics. Use the `california-market-analytics` skill for aggregated market questions such as average prices, trends, sales volume, days on market, and buyer-versus-seller conditions.

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

## Supported Search Fields

- city
- maximum price
- bedroom count
- bathroom count
- minimum square footage
- property type
- pool preference
- view preference
- maximum HOA
- sold-comps lookback period

## Execution Flow

The implementation follows this sequence:

1. `propertySearchSkill.ts`
2. `conversationManager.ts`
3. `sessionMemory.ts`
4. `parsePropertyQuery.ts`
5. One of:
   - `activeListings.ts`
   - `soldComps.ts`
6. `propertycards.ts`

The local CLI entrypoint is `src/cli.ts`.

## OpenClaw Session Identity

The CLI attempts to read channel context from:

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

The same sender must receive the same `userId` on every turn. Do not use a timestamp, random value, or per-message ID.

## Local Testing

From the `property-search-agent` directory, run:

```bash
npm run cli
```

or:

```bash
npx tsx src/cli.ts
```

Example property-search messages:

```text
Find me homes in Irvine under 1.2M
Only show single family homes with a pool
Show sold comps in Pasadena from the last 6 months
reset
```

## Limitation

The current session store uses an in-memory `Map`. It persists only while the Node.js process remains running. If OpenClaw starts a new process for every message, session memory must be moved to MySQL, a JSON file, Redis, or another persistent store.
