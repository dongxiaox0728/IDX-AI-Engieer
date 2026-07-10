import { parsePropertyQuery, mapToDbFilters } from "./parsePropertyQuery";

export async function propertySearchSkill(input: { query: string }) {
  const parsedFilters = await parsePropertyQuery(input.query);
  const dbFilters = mapToDbFilters(parsedFilters);

  return {
    originalQuery: input.query,
    parsedFilters,
    dbFilters,
  };
}