import { parsePropertyQuery, mapToDbFilters } from "../parsePropertyQuery";

async function runTests() {
  const queries = [
    "Show me 3-bedroom condos in Irvine under $1.5M with a pool.",
    "Find townhomes in Newport Beach under 900k.",
    "I want a single family home in Anaheim with 4 beds and 3 baths.",
    "Show properties in Irvine over 1800 sqft with a view.",
    "Find condos with HOA under 500.",
    "Show me houses in Tustin below $1,200,000 with pool.",
    "Find 2 bed 2 bath condos in Costa Mesa under 750k.",
    "I need a townhouse in Orange with 3 bedrooms and view.",
    "Show land in Laguna Beach under 2m.",
    "Find homes in Huntington Beach with 2500 square feet and HOA under 600.",
  ];

  for (const query of queries) {
    const parsed = await parsePropertyQuery(query);
    const dbFilters = mapToDbFilters(parsed);

    console.log("Query:", query);
    console.log("Parsed:", parsed);
    console.log("DB Filters:", dbFilters);
    console.log("-------------------------");
  }
}

runTests();