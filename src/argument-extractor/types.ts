import { GraphQLArgument } from "graphql";

export type BoundedArg = {
  value: GraphQLArgument;
  type: "boolean" | "enum";
  isNullable: boolean;
  isList: boolean;
};

export type UnboudedArg = {
  value: GraphQLArgument;
  type: "scalar";
};
