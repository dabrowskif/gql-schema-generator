import { writeFileSync } from "fs";
import {
  stringifyQueryArgs,
  stringifyField,
  stringifyFinalQuery,
} from "./stringifier";
import { Options, Field, CTX, CLIConfig } from "./types";
import { getActualGQLType } from "./utils";
import { fetchSchemaQueries } from "./schema-api";

export async function generateQueries(config: CLIConfig) {
  const queries = await fetchSchemaQueries(config.schemaGQLEndpoint);

  const opts: Options = {
    maxDepth: config.maxDepth ?? 30,
    maxSelfRef: config.maxSelfRef ?? 5,
    skipCartesianForFields: config.skipCartesianForFields ?? [],
  };

  Object.keys(queries).forEach((queryName) => {
    const gqlField = queries[queryName];

    const queryField: Field = {
      name: queryName,
      alias: queryName,
      value: gqlField,
      type: getActualGQLType(gqlField).type,
    };

    const ctx: CTX = {
      depth: 0,
      parentKey: "",
      boundedArgs: [],
    };

    const queryArgs = stringifyQueryArgs(gqlField);
    const field = stringifyField(queryField, ctx, opts, true);
    const finalQuery = stringifyFinalQuery(
      queryName,
      field,
      queryArgs,
      ctx.boundedArgs,
    );

    writeFileSync(`generated-queries/${queryName}.txt`, finalQuery);
  });
}
