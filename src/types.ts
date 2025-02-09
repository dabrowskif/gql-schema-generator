import { GraphQLType, GraphQLField, GraphQLInputType } from "graphql";

/**
 * Simple wrapper around GQLField
 */
export type Field<T = GraphQLType> = {
  name: string;
  alias: string;
  value: GraphQLField<any, any>;
  type: T;
};

export type CTX = {
  parentKey: string;
  depth: number;
  boundedArgs: {
    key: string;
    name: string;
    type: GraphQLInputType;
    queryParamKey: string;
  }[];
};

export type Options = {
  maxDepth: number;
  maxSelfRef: number;
  skipCartesianForFields: {
    field: string;
    argName: string;
    hardcodedValue: string;
  }[];
};

export type CLIConfig = {
  schemaGQLEndpoint: string;
  /**
   * Useful when certain fields take too much space and are rejected by server, but testing them with every possible arg compination is not necessary.
   */
  skipCartesianForFields?: Options["skipCartesianForFields"];
  maxDepth?: Options["maxDepth"];
  maxSelfRef?: Options["maxSelfRef"];
};
