import {
  GraphQLField,
  GraphQLType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLArgument,
} from "graphql";

/**
 * This allows us to get actual type in case field/argument is wrapped in a List or is NonNull
 * FIXME: refactor: return only fieldType
 */
export function getActualGQLType(
  fieldOrArg: GraphQLField<any, any> | GraphQLArgument,
) {
  let type: GraphQLType = fieldOrArg.type;

  let isNullable = true;
  let isList = false;

  while (type instanceof GraphQLNonNull || type instanceof GraphQLList) {
    if (type instanceof GraphQLNonNull) {
      isNullable = false;
    }
    if (type instanceof GraphQLList) {
      isList = true;
    }
    type = type.ofType;
  }

  return { type, isNullable, isList };
}

/**
 * Prevents excessive self-referencing. This generally could be omitted because we hase maxDepth, but to not bloat the query we can utilize such check.
 *
 * Extracts every part of parent key that is the same as fieldName.
 *
 *
 * @example fieldName: menu and parentKey: 'navigation.menu.item.menu.item' means that it has 2 self references
 */
export function getSelfRefCount(fieldName: string, parentKey: string) {
  return parentKey.split(".").filter((key) => key === fieldName).length;
}
