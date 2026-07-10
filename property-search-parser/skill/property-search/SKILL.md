---
name: property-search
description: Search active MLS listings and recently sold residential properties using natural-language filters.
user-invocable: true
---

# Property Search

Use this skill when the user asks to:

- Find active homes, condos, townhouses, or land
- Search properties by city, price, bedrooms, bathrooms, square footage, pool, or view
- Find recently sold properties, comparable properties, or comps
- Search sold properties within a requested number of months or years

## Run the search

Pass the user's complete original request to the property-search CLI.

```powershell
cd "C:\Users\xdx20\IDX-AI-Engineer\property-search-parser"
npx tsx src/cli.ts "<USER_QUERY>"
```

Replace `<USER_QUERY>` with the user's complete message.

Example:

```powershell
cd "C:\Users\xdx20\IDX-AI-Engineer\property-search-parser"
npx tsx src/cli.ts "Find sold homes in Irvine during the last 6 months."
```

## Response rules

- Return the CLI output to the user in a readable format.
- Do not invent properties or alter database values.
- Do not construct SQL directly.
- Do not expose database credentials, environment variables, stack traces, or internal errors.
- If the CLI says a city is missing, ask the user to provide a city.
- If no properties match, clearly say that no matching properties were found.
- Preserve prices, addresses, dates, bedroom counts, bathroom counts, and square footage exactly as returned.