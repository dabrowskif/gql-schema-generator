import { GraphQLEnumType } from "graphql";
import { BoundedArg, UnboudedArg } from "../argument-extractor/types";
import { isAliasWithParams } from "../stringifier/utils";
import { Options, CTX } from "../types";
import { getActualGQLType } from "../utils";
import { stringifyUnboudedArgs } from "../stringifier";

export function createAliasesFromBoundedArgs(
  fieldName: string,
  args: BoundedArg[],
  skippableArgs: Options["skipCartesianForFields"],
): string[] {
  // if we did not have bounded args, we just mock and create one fake alias with default field name. It will be used later for potential unbounded args and curated from () if no args at all.
  if (args.length === 0) {
    return [`${fieldName} ()`];
  }

  const argsValues = args.map((arg) => {
    const skippableArg = skippableArgs.find(
      (skippableArg) =>
        `${fieldName}.${arg.value.name}` ===
        `${skippableArg.field}.${skippableArg.argName}`,
    );

    if (skippableArg) {
      // TODO: implement ommitagleArg.value... for now its getting just first value for simplicity
      // In case we want to omit creating multiple aliases for specific arg, we just return one alias for one value
      const values = (arg.value.type as GraphQLEnumType)
        .getValues()
        .map((v) => v.value);

      let hardcodedValue = values[0];
      if (skippableArg) {
        if (values.includes(skippableArg.hardcodedValue)) {
          hardcodedValue = skippableArg.hardcodedValue;
        } else {
          console.warn(
            `Value ${skippableArg.hardcodedValue} for skippable arg ${skippableArg.field}.${skippableArg.argName} is incorrect. Available values: ${values}`,
          );
        }
      }

      return [
        {
          value: hardcodedValue,
          name: arg.value.name,
        },
      ];
    }

    switch (arg.type) {
      case "enum":
        const { type } = getActualGQLType(arg.value);
        return (type as GraphQLEnumType).getValues().map((value) => ({
          name: arg.value.name,
          value: value.name,
        }));
      case "boolean":
        return ["true", "false"].map((val) => ({
          name: arg.value.name,
          value: val,
        }));
    }
  });

  // Cartesian product of all enum values
  const allValuesCombinations = argsValues.reduce(
    (acc, curr) => acc.flatMap((prev) => curr.map((item) => [...prev, item])),
    [[]],
  );

  return allValuesCombinations.map((combination) => {
    const aliasName = `${fieldName}_${combination.map((c) => c.value).join("_")}`;
    const args = combination.map((c) => `${c.name}: ${c.value}`).join(", ");

    return `${aliasName}: ${fieldName}(${args})`;
  });
}

export function appendUnboundedArgsToAliases(
  currentKey: string,
  aliases: string[],
  args: UnboudedArg[],
  ctx: CTX,
) {
  if (args.length === 0) {
    return aliases;
  }

  return aliases.map((alias) => {
    // "open" alias parenthesis to inserd unbounted args
    const aliasWithOpenedParenthesis = alias.slice(0, alias.length - 1);

    const unboundedArgsString = stringifyUnboudedArgs(args, ctx, currentKey);

    if (!unboundedArgsString) {
      return alias;
    }

    const hasParams = isAliasWithParams(alias);

    //if we had any bounded params in alias, we have to put ',' between bounded and unbouded args
    if (hasParams) {
      return `${aliasWithOpenedParenthesis}, ${unboundedArgsString})`;
    }
    return `${aliasWithOpenedParenthesis}${unboundedArgsString})`;
  });
}
