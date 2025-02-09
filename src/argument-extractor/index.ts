import { GraphQLField, GraphQLEnumType, GraphQLScalarType } from "graphql";
import { getActualGQLType } from "../utils";
import { BoundedArg, UnboudedArg } from "./types";

/**
 * Bounded arg is arg that is finite, like enum (has finite number of values) or boolean (has 2 values)
 * Unbounded arg is arg that is infinite, like string or int (we can pass any number/string as this arg)
 * This allows us to create multiple aliases per bounded args using their cartesian product, and pass unbouded args as dynamic arguments that are specified by user.
 */
export function getFieldArguments(field: GraphQLField<any, any>) {
  const args = field.args.reduce(
    (acc, arg) => {
      const { type: argType, isList, isNullable } = getActualGQLType(arg);

      if (argType instanceof GraphQLEnumType) {
        acc.boundedArgs.push({ value: arg, type: "enum", isNullable, isList });
      } else if (
        argType instanceof GraphQLScalarType &&
        (arg.type as GraphQLScalarType).name === "Boolean"
      ) {
        acc.boundedArgs.push({
          value: arg,
          type: "boolean",
          isList,
          isNullable,
        });
      } else {
        if (field.name.includes("pageInfo")) {
          console.log("UNKNOWN TYPE, maybe scalar?", arg.type);
        }

        acc.unboundedArgs.push({ value: arg, type: "scalar" });
      }
      return acc;
    },
    { boundedArgs: [] as BoundedArg[], unboundedArgs: [] as UnboudedArg[] },
  );

  return args;
}
