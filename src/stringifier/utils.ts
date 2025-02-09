import { getFieldArguments } from "../argument-extractor";
import { Field } from "../types";

/**
 * If alias is without any params, remove empty parenthesis from it
 */
export function curateAliases(aliases: string[]) {
  return aliases.map((alias) =>
    isAliasWithParams(alias) ? alias : removeEmptyParamsFromAlias(alias),
  );
}

export function isAliasWithParams(alias: string) {
  return alias[alias.length - 1] === ")" && alias[alias.length - 2] !== "(";
}

export function addArgsToQuery(field: Field) {
  const { boundedArgs, unboundedArgs } = getFieldArguments(field.value);
  if (boundedArgs.length === 0 && unboundedArgs.length === 0) {
    return `${field.alias}`;
  }

  const args = [...boundedArgs, ...unboundedArgs]
    .map((arg) => `${arg.value.name}: $${arg.value.name}`)
    .join(", ");

  return `${field.alias}(${args})`;
}

function removeEmptyParamsFromAlias(alias: string) {
  return alias.slice(0, alias.length - 2);
}
