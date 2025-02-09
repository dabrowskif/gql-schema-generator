import { getIntrospectionQuery, buildClientSchema } from "graphql";

export async function fetchSchemaQueries(endpoint: string) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: getIntrospectionQuery() }),
  });

  const { data } = await response.json();
  const schema = buildClientSchema(data);
  const queryType = schema.getQueryType();

  if (!queryType) {
    throw new Error("No query type found in schema");
  }

  return queryType.getFields();
}
