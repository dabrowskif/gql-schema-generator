import {
  GraphQLObjectType,
  GraphQLUnionType,
  GraphQLField,
  GraphQLScalarType,
} from "graphql";
import { getFieldArguments } from "../argument-extractor";
import {
  createAliasesFromBoundedArgs,
  appendUnboundedArgsToAliases,
} from "../query-generator";
import { Field, CTX, Options } from "../types";
import { getActualGQLType } from "../utils";
import { addArgsToQuery, curateAliases } from "./utils";
import { UnboudedArg } from "../argument-extractor/types";

export function stringifyField<T>(
  field: Field<T>,
  ctx: CTX,
  opts: Options,
  isQueryField = false,
): string {
  // Prevent infinite recursion
  if (ctx.depth > opts.maxDepth) return "";

  // FIXME: weird types narrowing in all if cases
  if (field.type instanceof GraphQLObjectType) {
    return stringifyObjectType(
      field as Field<GraphQLObjectType>,
      ctx,
      opts,
      isQueryField,
    );
  } else if (field.type instanceof GraphQLUnionType) {
    return stringifyUnionType(field as Field<GraphQLUnionType>, ctx, opts);
  }

  // Fallback for other types
  return field.alias;
}

function stringifyObjectType(
  field: Field<GraphQLObjectType>,
  ctx: CTX,
  opts: Options,
  isQuery = false,
) {
  const parentKey = ctx.parentKey
    ? `${ctx.parentKey}.${field.name}`
    : field.name;

  const subFields = Object.entries(field.type.getFields());

  const stringifiedSubFields = subFields
    .map(([subFieldName, subFieldValue]) => {
      const { boundedArgs, unboundedArgs } = getFieldArguments(subFieldValue);

      const aliases = createAliasesFromBoundedArgs(
        subFieldName,
        boundedArgs,
        opts.skipCartesianForFields,
      );

      const currentKey = parentKey + "." + subFieldName;

      const fullAliases = appendUnboundedArgsToAliases(
        currentKey,
        aliases,
        unboundedArgs,
        ctx,
      );

      const curatedAliases = curateAliases(fullAliases);

      return curatedAliases
        .map((alias) =>
          stringifyField(
            {
              name: subFieldName,
              alias,
              value: subFieldValue,
              type: getActualGQLType(subFieldValue).type,
            },
            {
              parentKey,
              depth: ctx.depth + 1,
              boundedArgs: ctx.boundedArgs,
            },
            opts,
          ),
        )
        .filter(Boolean)
        .join("\n");
    })
    .filter(Boolean)
    .join("\n");

  if (isQuery) {
    const queryWithArgs = addArgsToQuery(field);
    return `${queryWithArgs} { ${stringifiedSubFields} }`;
  }

  return `${field.alias} { ${stringifiedSubFields} }`;
}

function stringifyUnionType(
  field: Field<GraphQLUnionType>,
  ctx: CTX,
  opts: Options,
) {
  const unionTypes = field.type.getTypes();

  const unionQueries = unionTypes
    .map((type) => {
      const subFields = Object.entries(type.getFields());

      const stringifiedSubFields = subFields
        .map(([subFieldName, subFieldValue]) => {
          // Creating alias allows to prevent errors where two fields with same names in different union types have different types
          const alias = `${subFieldName}${type.name}: ${subFieldName}`;

          return stringifyField(
            {
              name: subFieldName,
              alias,
              value: subFieldValue,
              type: getActualGQLType(subFieldValue).type,
            },
            {
              parentKey: ctx.parentKey
                ? `${ctx.parentKey}.${field.name}`
                : field.name,
              depth: ctx.depth + 1,
              boundedArgs: ctx.boundedArgs,
            },
            opts,
          );
        })
        .filter(Boolean)
        .join("\n");

      return `... on ${type.name} { ${stringifiedSubFields} }`;
    })
    .filter(Boolean)
    .join("\n");

  return `${field.alias} { ${unionQueries} }`;
}

export function stringifyQueryArgs(fieldValue: GraphQLField<any, any, any>) {
  const { boundedArgs, unboundedArgs } = getFieldArguments(fieldValue);
  const allArgs = [...boundedArgs, ...unboundedArgs];

  const args = allArgs.map((arg) => {
    let stringifiedArg = `$${arg.value.name}: ${arg.value.type}`;
    const defaultValue = arg.value.defaultValue;

    if (!defaultValue) {
      return stringifiedArg;
    }

    // if defaultValue is not an object, we can assign normally
    if (typeof defaultValue !== "object") {
      return `${stringifiedArg} = ${defaultValue}`;
    }

    // If defaultValue is an object, we have to remove quotes from object keys and string values
    const curatedDefaultValue = JSON.stringify(arg.value.defaultValue, null, 0)
      .replace(/"(\w+)":/g, "$1:")
      .replace(/"([^"]+)"/g, "$1");

    return `${stringifiedArg} = ${curatedDefaultValue}`;
  });

  return args.join(", ");
}

/**
 * @param resolversArgs are all args that appeared during query generation and are required for some resolvers
 */
export function stringifyFinalQuery(
  queryName: string,
  queryFields: string,
  queryArgs: string,
  resolversArgs: CTX["boundedArgs"],
): string {
  const stringifiedBoundedArgs = resolversArgs
    .map((arg) => {
      // For Int args we can assign fake default value
      // For String args it is generally hard to do it, therefore those values are required
      const defaultValue = (() => {
        switch ((arg.type as GraphQLScalarType).name) {
          case "Int":
            return 30;
        }
      })();

      if (defaultValue) {
        return `$${arg.queryParamKey}: ${arg.type} = ${defaultValue}`;
      }

      return `$${arg.queryParamKey}: ${arg.type}`;
    })
    .join(", ");

  if (!queryArgs) {
    return `query GQLNuker_${queryName} (${stringifiedBoundedArgs}) { ${queryFields} }`;
  }

  return `query GQLNuker_${queryName} (${queryArgs}, ${stringifiedBoundedArgs}) { ${queryFields} }`;
}

export function stringifyUnboudedArgs(
  args: UnboudedArg[],
  ctx: CTX,
  currentKey: string,
): string {
  return args
    .map((arg) => {
      // we can put some option to control how many parent key parts we have to take by default
      const parentKeyParts = currentKey.split(".");
      const lastParentKeyPart = parentKeyParts.pop();
      const subLastParentKeyPart = parentKeyParts.pop();

      const queryParamKey = [
        subLastParentKeyPart,
        lastParentKeyPart,
        arg.value.name,
      ].join("_");

      // temporarily disabled... some args can overlap but dont care for now
      // adjustQueryParamKey();

      const unboundedArg = {
        key: currentKey,
        name: arg.value.name,
        type: arg.value.type,
        queryParamKey,
      };

      const existingArg = ctx.boundedArgs.find(
        (arg) =>
          // lets skip checking parentKey for now - basically in the full implementation we should select key candidates and append prefixes if they overlap
          // arg.parentKey === unboundedArg.parentKey &&
          arg.name === unboundedArg.name &&
          arg.queryParamKey === unboundedArg.queryParamKey,
      );

      if (existingArg) {
        return `${existingArg.name}: $${existingArg.queryParamKey}`;
      }

      unboundedArg.queryParamKey = queryParamKey;
      ctx.boundedArgs.push(unboundedArg);
      return `${arg.value.name}: $${unboundedArg.queryParamKey}`;
    })
    .join(", ");
}
