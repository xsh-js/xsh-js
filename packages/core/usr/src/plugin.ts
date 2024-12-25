/*
 * Copyright 2024 Sergey Zholobov
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {getRulesByCategory, GlobalRules, RuleCategories, RuleContext, RuleProps} from "@/rules";
import {validateConfig, ValidConfig} from "@/config";
import {
  getFunction,
  isArray,
  isEmptyString,
  isFunction,
  isObject,
  isString,
  prepareParam,
  prepareProperty
} from "@/utilities";
import {ArgumentCheck, Literals, ScopeVars} from "@/constants";
import {
  convertArray,
  ConvertContext,
  ConvertMeta,
  convertObjectFromEntities,
  ConvertProps,
  MathContext,
  MathMeta,
  MathProps,
  parseMath
} from "@/convert";
import {Continue, MathResultInvalidError} from "@/exceptions";
import {convertToCamelCase, error, stripSlashes} from "@/functions";
import {
  getRunnableConstName,
  getRunnableVariableName,
  getVar,
  getVariableHash,
  getVariableName,
  isRunnableVariable,
  isVariable,
  setVar
} from "@/variables";
import {exec, execCommandAsync, execCommandSync, parse, SubCommandContext, SubCommandProps} from "@/parser";
import {execFn, isCommandCallable} from "@/commands";
import {TemplateProps} from "@/templates";

/**
 * Command delimiters
 */
export const CommandDelimiters = {
  /**
   * Null check
   */
  NULLISH: '??',
  /**
   * Parameter
   */
  PARAM: ' ',
  /**
   * End of command
   */
  END: ';',
  /**
   * Output to a variable
   */
  OUT: '>>',
  /**
   * Result of the previous command
   */
  CONTEXT: '|',
  /**
   * Successful completion of the previous command
   */
  SUCCESS: '&&',
  /**
   * Unsuccessful completion of the previous command
   */
  FAIL: '||',
}


/**
 * Math actions
 */
export const MathActions = {
  /**
   * Add
   */
  ADD: '+',
  /**
   * Subtract
   */
  SUB: '-',
  /**
   * Multiply
   */
  MUL: '*',
  /**
   * Division
   */
  DIV: '/',
  /**
   * Remainder of division
   */
  MOD: '%',
  /**
   * Greater than
   */
  GE: '>=',
  /**
   * Less than
   */
  LE: '<=',
  /**
   * Less
   */
  GT: '>',
  /**
   * Grater
   */
  LT: '<',
  /**
   * Equal
   */
  EQ: '==',
  /**
   * Not equal
   */
  NE: '!=',
  /**
   * Equivalent
   */
  EQV: '===',
  /**
   * Not equivalent
   */
  NEQ: '!==',
}

/**
 * Value check
 */
export const Check = {
  /**
   * Has math
   */
  HAS_MATH: /(===|!==|==|!=|>=|<=|>|<|-|\+|\*|\/|%)/g,
  /**
   * Is variable
   */
  IS_VARIABLE: /^\$+/,
}

/**
 * Type check
 */
export const TypeChecks = {
  /**
   * Is number
   */
  NUMBER: /^-?\d+$/,
  /**
   * Is float
   */
  FLOAT: /^-?\d+\.\d+$/,
}

/**
 * Object and command borders
 */
export const ComplexBorders = {
  /**
   * Object start
   */
  OBJ_START: '{',
  /**
   * Object end
   */
  OBJ_END: '}',
  /**
   * Array start
   */
  ARR_START: '[',
  /**
   * Array end
   */
  ARR_END: ']',
  /**
   * Command start
   */
  CMD_START: '(',
  /**
   * Command end
   */
  CMD_END: ')',
}

/**
 * Delimiters
 */
export const Delimiters = {
  /**
   * Object part
   */
  OBJ_PART: '.',
  /**
   * Array item
   */
  ARR_ITEM: ',',
  /**
   * JSON key
   */
  JSON_KEY: ':',
  /**
   * JSON item
   */
  JSON_ITEM: ',',
}

/**
 * Template commands
 */
export const ContentCommands = {
  /**
   * System command
   */
  TPL_XSH_SYSTEM_CONST: /__XSH_SYSTEM_(?<name>\w+?)__/gi,
  /**
   * Inline command
   */
  TPL_XSH_INLINE_COMMAND: /`#xsh\s+(?<command>.*?)(?<!\\)`/gi,
  /**
   * Variable output
   */
  TPL_XSH_VAR_CONST: /__XSH_VAR_(?<name>\w+?)__/gi,
  /**
   * Command output
   */
  TPL_XSH_RUN_CONST: /__XSH_RUN_(?<name>\w+?)__/gi,
}

/**
 * Trim spaces
 */
export const Trim = {
  /**
   * At the start and the end
   */
  BORDERS: [/^\s+/g, /\s+$/g],
  /**
   * Double spaces
   */
  SPACES: /\s\s+/g,
  /**
   * Around math actions
   */
  MATH: /\s*(,|:|\|\||&&|\?\?|===|!==|==|!=|>=|<=|>|<|\+|\*|\/|\||%)\s*/g,
  /**
   * Around braces
   */
  BRACES: [/([[({])\s*/g, /\s*([)}\]])/g],
}

/**
 * Prepare argument
 */
export const PrepareArguments = {
  /**
   * Brackets
   */
  BRACKETS: /(?<!\\)([`'"])(.*?)(?<!\\)\1/g,
  /**
   * Braces
   */
  BRACES: [/\(([^()]*?)\)/g, /\[([^[\]]*?)\]/g, /\{([^{}]*)\}/g],
  /**
   * Minus number
   */
  MINUS: /(?<=\s|[[({*/+,&|><=%?:;]|^)(-\d+(\.\d+)?)(?=\s|[\])}*/+,&|!><=%?;]|$)/g,
}

/**
 * Get plugin config
 */
export function plugin(): ValidConfig<Record<string, any>, Partial<Record<keyof GlobalRules, any>>> {
  return validateConfig({
    rules: {
      command: {
        end: {
          key: CommandDelimiters.END,
          callback: ({
                       [SubCommandProps.context.SCOPE]: scope,
                       [SubCommandProps.context.SUBCOMMAND]: subcommand,
                     }): unknown => {
            let res: unknown;
            for (const part of subcommand) {
              if (isEmptyString(part, true)) {
                res = undefined;
              } else {
                res = execCommandSync(part, scope);
              }
            }
            return res;
          },
          callbackAsync: async ({
                                  [SubCommandProps.context.SCOPE]: scope,
                                  [SubCommandProps.context.SUBCOMMAND]: subcommand,
                                }): Promise<unknown> => {
            let res: unknown;
            for (const part of subcommand) {
              if (isEmptyString(part, true)) {
                res = undefined;
              } else {
                res = await execCommandAsync(part, scope);
              }
            }
            return res;
          },
          order: -1000
        },
        fail: {
          key: CommandDelimiters.FAIL,
          callback: ({
                       [SubCommandProps.context.SCOPE]: scope,
                       [SubCommandProps.context.SUBCOMMAND]: subcommand,
                     }): unknown => {
            let res: unknown;
            for (const part of subcommand) {
              res = execCommandSync(part, scope);
              // Break on first "true"
              if (res) {
                return res;
              }
            }
            return res;
          },
          callbackAsync: async ({
                                  [SubCommandProps.context.SCOPE]: scope,
                                  [SubCommandProps.context.SUBCOMMAND]: subcommand,
                                }): Promise<unknown> => {
            let res: unknown;
            for (const part of subcommand) {
              res = await execCommandAsync(part, scope);
              // Break on first "true"
              if (res) {
                return res;
              }
            }
            return res;
          },
          order: -900
        },
        success: {
          key: CommandDelimiters.SUCCESS,
          callback: ({
                       [SubCommandProps.context.SCOPE]: scope,
                       [SubCommandProps.context.SUBCOMMAND]: subcommand,
                     }): unknown => {
            let res: unknown;
            for (const part of subcommand) {
              res = execCommandSync(part, scope);
              // Break on first "false"
              if (!res) {
                return res;
              }
            }
            return res;
          },
          callbackAsync: async ({
                                  [SubCommandProps.context.SCOPE]: scope,
                                  [SubCommandProps.context.SUBCOMMAND]: subcommand,
                                }): Promise<unknown> => {
            let res: unknown;
            for (const part of subcommand) {
              res = await execCommandAsync(part, scope);
              // Break on first "false"
              if (!res) {
                return res;
              }
            }
            return res;
          },
          order: -800
        },
        nullish: {
          key: CommandDelimiters.NULLISH,
          callback: ({
                       [SubCommandProps.context.SCOPE]: scope,
                       [SubCommandProps.context.SUBCOMMAND]: subcommand,
                     }): unknown => {
            let res: unknown;
            for (const part of subcommand) {
              res = execCommandSync(part, scope);
              // Break on first nullish value
              if (res != null) {
                return res;
              }
            }
            return res;
          },
          callbackAsync: async ({
                                  [SubCommandProps.context.SCOPE]: scope,
                                  [SubCommandProps.context.SUBCOMMAND]: subcommand,
                                }): Promise<unknown> => {
            let res: unknown;
            for (const part of subcommand) {
              res = await execCommandAsync(part, scope);
              // Break on first nullish value
              if (res != null) {
                return res;
              }
            }
            return res;
          },
          order: -700
        },
        context: {
          key: CommandDelimiters.CONTEXT,
          callback: ({
                       [SubCommandProps.context.SCOPE]: scope,
                       [SubCommandProps.context.SUBCOMMAND]: subcommand,
                     }): unknown => {
            let res: unknown;
            for (const part of subcommand) {
              // Save previous context
              const prevContext = scope[ScopeVars.CONTEXT];
              if (res !== undefined) {
                // Use last result as context
                scope[ScopeVars.CONTEXT] = res;
              }
              // Run context
              res = execCommandSync(part, scope);
              // Restore context
              scope[ScopeVars.CONTEXT] = prevContext;
            }
            return res;
          },
          callbackAsync: async ({
                                  [SubCommandProps.context.SCOPE]: scope,
                                  [SubCommandProps.context.SUBCOMMAND]: subcommand,
                                }): Promise<unknown> => {
            let res: unknown;
            for (const part of subcommand) {
              // Save previous context
              const prevContext = scope[ScopeVars.CONTEXT];
              if (res !== undefined) {
                // Use last result as context
                scope[ScopeVars.CONTEXT] = res;
              }
              // Run context
              res = await execCommandAsync(part, scope);
              // Restore context
              scope[ScopeVars.CONTEXT] = prevContext;
            }
            return res;
          },
          order: -600
        },
        out: {
          key: CommandDelimiters.OUT,
          callback: ({
                       [SubCommandProps.context.SCOPE]: scope,
                       [SubCommandProps.context.SUBCOMMAND]: subcommand,
                     }): unknown => {
            const res = execCommandSync(subcommand[0], scope);
            for (let i = 1; i < subcommand.length; i++) {
              const variable = execCommandSync(subcommand[i], scope) as string;
              setVar(variable, res);
            }
            return res;
          },
          callbackAsync: async ({
                                  [SubCommandProps.context.SCOPE]: scope,
                                  [SubCommandProps.context.SUBCOMMAND]: subcommand,
                                }): Promise<unknown> => {
            const res = await execCommandAsync(subcommand[0], scope);
            for (let i = 1; i < subcommand.length; i++) {
              const variable = await execCommandAsync(subcommand[i], scope) as string;
              setVar(variable, res);
            }
            return res;
          },
          order: -500
        },
        param: {
          key: CommandDelimiters.PARAM,
          callback: ({
                       [SubCommandProps.context.RULE]: rule,
                       [SubCommandProps.context.SCOPE]: scope,
                       [SubCommandProps.context.SUBCOMMAND]: subcommand,
                     }): unknown => {
            const args: unknown[] = convertArray(subcommand as string[], scope, false, false);
            const checkValue = getFunction(rule.meta, 'checkValue');
            return checkValue(args, {scope});
          },
          callbackAsync: async ({
                                  [SubCommandProps.context.RULE]: rule,
                                  [SubCommandProps.context.SCOPE]: scope,
                                  [SubCommandProps.context.SUBCOMMAND]: subcommand,
                                }): Promise<unknown> => {
            const args: unknown[] = await convertArray<string, true>(subcommand as string[], scope, false, true);
            const checkValue = getFunction(rule.meta, 'checkValue');
            return checkValue(args, {scope});
          },
          meta: {
            checkValue: (...args: [value: unknown[], context: Pick<RuleContext<SubCommandContext>, typeof SubCommandProps.context.SCOPE>]): unknown => {
              const value = prepareParam(args, 0, ArgumentCheck.ARRAY);
              const context = prepareParam(args, 1, ArgumentCheck.OBJECT);
              // Use first argument as function
              const fn = value[0] as string;
              const isNativeFunction = isFunction(fn);
              // If function callable
              if (isCommandCallable(fn) || isNativeFunction) {
                // Execute function
                return execFn(fn, value.toSpliced(0, 1), context.scope, isNativeFunction);
              } else if (value.length > 1) { // Return array
                return value;
              }
              // Return scalar value
              return fn;
            }
          },
          order: -400
        }
      },
      math: {
        ge: {
          key: MathActions.GE,
          callback: (context): unknown => {
            const operand1 = prepareProperty<number, typeof context>(context, MathProps.context.OPERAND1, ArgumentCheck.NUMBER);
            const operand2 = prepareProperty<number, typeof context>(context, MathProps.context.OPERAND2, ArgumentCheck.NUMBER);

            return operand1 >= operand2;
          }
        },
        le: {
          key: MathActions.LE,
          callback: (context): unknown => {
            const operand1 = prepareProperty<number, typeof context>(context, MathProps.context.OPERAND1, ArgumentCheck.NUMBER);
            const operand2 = prepareProperty<number, typeof context>(context, MathProps.context.OPERAND2, ArgumentCheck.NUMBER);

            return operand1 <= operand2;
          }
        },
        eqv: {
          key: MathActions.EQV,
          callback: ({operand1, operand2}): unknown => {
            return operand1 === operand2;
          }
        },
        neq: {
          key: MathActions.NEQ,
          callback: ({operand1, operand2}): unknown => {
            return operand1 !== operand2;
          }
        },
        eq: {
          key: MathActions.EQ,
          callback: ({operand1, operand2}): unknown => {
            return operand1 == operand2;
          }
        },
        ne: {
          key: MathActions.NE,
          callback: ({operand1, operand2}): unknown => {
            return operand1 != operand2;
          }
        },
        gt: {
          key: MathActions.GT,
          callback: (context): unknown => {
            const operand1 = prepareProperty<number, typeof context>(context, MathProps.context.OPERAND1, ArgumentCheck.NUMBER);
            const operand2 = prepareProperty<number, typeof context>(context, MathProps.context.OPERAND2, ArgumentCheck.NUMBER);

            return operand1 > operand2;
          }
        },
        lt: {
          key: MathActions.LT,
          callback: (context): unknown => {
            const operand1 = prepareProperty<number, typeof context>(context, MathProps.context.OPERAND1, ArgumentCheck.NUMBER);
            const operand2 = prepareProperty<number, typeof context>(context, MathProps.context.OPERAND2, ArgumentCheck.NUMBER);

            return operand1 < operand2;
          }
        },
        add: {
          key: MathActions.ADD,
          callback: (context): unknown => {
            const operand1 = prepareProperty<number | string | typeof Array | typeof Object, typeof context>(context, MathProps.context.OPERAND1, [...ArgumentCheck.NUMBER, ...ArgumentCheck.STRING, ...ArgumentCheck.ARRAY, ...ArgumentCheck.OBJECT]);
            const operand2 = prepareProperty<number | string | typeof Array | typeof Object, typeof context>(context, MathProps.context.OPERAND2, [...ArgumentCheck.NUMBER, ...ArgumentCheck.STRING, ...ArgumentCheck.ARRAY, ...ArgumentCheck.OBJECT]);

            if (isArray(operand1) && isArray(operand2)) {
              return operand1.concat(operand2);
            }
            if (isObject(operand1) && isObject(operand2)) {
              return {
                ...operand1,
                ...operand2
              };
            }
            return (operand1 as number) + (operand2 as number);
          }
        },
        sub: {
          key: MathActions.SUB,
          callback: (context): unknown => {
            const operand1 = prepareProperty<number, typeof context>(context, MathProps.context.OPERAND1, ArgumentCheck.NUMBER);
            const operand2 = prepareProperty<number, typeof context>(context, MathProps.context.OPERAND2, ArgumentCheck.NUMBER);

            return operand1 - operand2;
          }
        },
        mul: {
          key: MathActions.MUL,
          callback: (context): unknown => {
            const operand1 = prepareProperty<number, typeof context>(context, MathProps.context.OPERAND1, ArgumentCheck.NUMBER);
            const operand2 = prepareProperty<number, typeof context>(context, MathProps.context.OPERAND2, ArgumentCheck.NUMBER);

            return operand1 * operand2;
          }
        },
        div: {
          key: MathActions.DIV,
          callback: (context): unknown => {
            const operand1 = prepareProperty<number, typeof context>(context, MathProps.context.OPERAND1, ArgumentCheck.NUMBER);
            const operand2 = prepareProperty<number, typeof context>(context, MathProps.context.OPERAND2, ArgumentCheck.NUMBER);

            return operand1 / operand2;
          }
        },
        mod: {
          key: MathActions.MOD,
          callback: (context): unknown => {
            const operand1 = prepareProperty<number, typeof context>(context, MathProps.context.OPERAND1, ArgumentCheck.NUMBER);
            const operand2 = prepareProperty<number, typeof context>(context, MathProps.context.OPERAND2, ArgumentCheck.NUMBER);

            return operand1 % operand2;
          }
        }
      },
      convert: {
        isString: {
          callback: ({
                       [ConvertProps.context.VALUE]: value
                     }): unknown => {
            if (!isString(value)) {
              return value;
            }
            throw new Continue();
          },
          order: -9999,
        },
        isNull: {
          callback: ({
                       [ConvertProps.context.VALUE]: value
                     }): null => {
            if (value.toLowerCase() === Literals.NULL) {
              return null;
            }
            throw new Continue();
          },
          order: -9800,
        },
        isUndefined: {
          callback: ({
                       [ConvertProps.context.VALUE]: value
                     }): null => {
            if (value.toLowerCase() === Literals.UNDEFINED) {
              return undefined;
            }
            throw new Continue();
          },
          order: -9700,
        },
        isEmptyString: {
          callback: ({
                       [ConvertProps.context.VALUE]: value
                     }): string => {
            if (isEmptyString(value)) {
              return "";
            }
            throw new Continue();
          },
          order: -9600,
        },
        isTrue: {
          callback: ({
                       [ConvertProps.context.VALUE]: value
                     }): boolean => {
            // Convert to true
            if (value.toLowerCase() === Literals.TRUE) {
              return true;
            }
            throw new Continue();
          },
          order: -9500,
        },
        isFalse: {
          callback: ({
                       [ConvertProps.context.VALUE]: value
                     }): boolean => {
            // Convert to false
            if (value.toLowerCase() === Literals.FALSE) {
              return false;
            }
            throw new Continue();
          },
          order: -9400,
        },
        isNumber: {
          callback: ({
                       [ConvertProps.context.VALUE]: value
                     }): number => {
            // Convert to number
            if (value.match(TypeChecks.NUMBER)) {
              return parseInt(value);
            }
            throw new Continue();
          },
          order: -9300,
        },
        isFloat: {
          callback: ({
                       [ConvertProps.context.VALUE]: value
                     }): number => {
            // Convert to float
            if (value.match(TypeChecks.FLOAT)) {
              return parseFloat(value);
            }
            throw new Continue();
          },
          order: -9300,
        },
        isKeys: {
          callback: ({
                       [ConvertProps.context.VALUE]: value
                     }): string => {
            // If starts with "-", then it's optional parameters or mode
            if (value.startsWith(MathActions.SUB)) {
              return value;
            }
            throw new Continue();
          },
          order: -1000,
        },
        isMath: {
          callback: ({
                       [ConvertProps.context.RULE]: rule,
                       [ConvertProps.context.SCOPE]: scope,
                       [ConvertProps.context.VALUE]: value
                     }): unknown => {
            // If has math
            if (value.match(Check.HAS_MATH)) {
              const checkValue = getFunction(rule.meta, 'checkValue');
              const MATH = getRulesByCategory(RuleCategories.MATH);
              for (const math of MATH) {
                const maths = value.split(math.key);
                // If it has at least two operands
                if (maths.length > 1) {
                  const operands: unknown[] = convertArray(maths, scope, false, false);
                  return checkValue(operands, {
                    scope,
                    rule: math
                  });
                }
              }
            }
            throw new Continue();
          },
          callbackAsync: async ({
                                  [ConvertProps.context.RULE]: rule,
                                  [ConvertProps.context.SCOPE]: scope,
                                  [ConvertProps.context.VALUE]: value
                                }): Promise<unknown> => {
            // If has math
            if (value.match(Check.HAS_MATH)) {
              const checkValue = getFunction(rule.meta, 'checkValue');
              const MATH = getRulesByCategory(RuleCategories.MATH);
              for (const math of MATH) {
                const maths = value.split(math.key);
                // If it has at least two operands
                if (maths.length > 1) {
                  const operands: unknown[] = await convertArray(maths, scope, false, true);
                  return checkValue(operands, {
                    scope,
                    rule: math
                  });
                }
              }
            }
            throw new Continue();
          },
          meta: {
            checkValue: (value: unknown[], {
              [RuleProps.context.SCOPE]: scope,
              [RuleProps.context.RULE]: rule
            }: Pick<RuleContext<MathContext, MathMeta>, typeof RuleProps.context.SCOPE | typeof RuleProps.context.RULE>): unknown => {
              // Part math
              const res = parseMath(rule, value, scope);
              // Return non undefined result
              if (res !== undefined) {
                return res;
              }

              error(new MathResultInvalidError({
                mathType: rule.key,
                operands: value
              }));
            }
          },
          order: -900,
        },
        isVariable: {
          callback: ({
                       [ConvertProps.context.RULE]: rule,
                       [ConvertProps.context.SCOPE]: scope,
                       [ConvertProps.context.VALUE]: value,
                       [ConvertProps.context.ASYNC]: async
                     }): unknown => {
            if (isVariable(value)) {
              const checkValue = getFunction(rule.meta, 'checkValue');
              // Remove "$" from start
              const variable = value.replace(Check.IS_VARIABLE, '');
              // Split by ".", for nested objects
              const vars = convertArray(variable.split(Delimiters.OBJ_PART), scope, false, false) as string[];

              // Get variable value
              const res = getVar<string | string[]>(vars, scope);

              // If it's null, then all nested items is null
              if (res == null) {
                return res;
              }

              // If value starts with "$$", then it's running variable
              if (isRunnableVariable(value)) {
                return checkValue(res, {scope, async});
              }

              return res;
            }
            throw new Continue();
          },
          callbackAsync: async ({
                                  [ConvertProps.context.RULE]: rule,
                                  [ConvertProps.context.SCOPE]: scope,
                                  [ConvertProps.context.VALUE]: value,
                                  [ConvertProps.context.ASYNC]: async
                                }): Promise<unknown> => {
            if (isVariable(value)) {
              const checkValue = getFunction(rule.meta, 'checkValue');
              // Remove "$" from start
              const variable = value.replace(Check.IS_VARIABLE, '');
              // Split by ".", for nested objects
              const vars = await convertArray(variable.split(Delimiters.OBJ_PART), scope, false, true) as string[];

              // Get variable value
              const res = await getVar<Promise<string | string[]>>(vars, scope);

              // If it's null, then all nested items is null
              if (res == null) {
                return res;
              }

              // If value starts with "$$", then it's running variable
              if (isRunnableVariable(value)) {
                return checkValue(res, {scope, async});
              }

              return res;
            }
            throw new Continue();
          },
          meta: {
            checkValue: (value: string | string[], {
              [ConvertProps.context.SCOPE]: scope,
              [ConvertProps.context.ASYNC]: async
            }: Pick<RuleContext<ConvertContext, ConvertMeta>, typeof ConvertProps.context.SCOPE | typeof ConvertProps.context.ASYNC>): unknown => {
              // If value is string
              if (isString(value)) {
                // If it's command
                if (value.startsWith(ComplexBorders.CMD_START) && value.endsWith(ComplexBorders.CMD_END)) {
                  // Remove braces
                  value = value.substring(1, value.length - 1);
                  // Parse inner value
                  return exec(value, scope, true, async);
                } else if (value.startsWith(ComplexBorders.ARR_START) && value.endsWith(ComplexBorders.ARR_END)) { // If it's array
                  // Remove braces
                  value = value.substring(1, value.length - 1);
                  // Return empty array if value is empty
                  if (isEmptyString(value, true)) {
                    return [];
                  }
                  // Get items
                  const items = value.split(Delimiters.ARR_ITEM);
                  return convertArray(items, scope, false, async);
                } else if (value.startsWith(ComplexBorders.OBJ_START) && value.endsWith(ComplexBorders.OBJ_END)) {// If it's object
                  // Remove braces
                  value = value.substring(1, value.length - 1);
                  // Return empty object if value is empty
                  if (isEmptyString(value, true)) {
                    return {};
                  }
                  const items = value.split(Delimiters.JSON_ITEM);
                  const args: ([unknown, unknown])[] = [];
                  let ind = 0;
                  // Convert each item
                  for (const item of items) {
                    // Split by key delimiter
                    const assoc = item.split(Delimiters.JSON_KEY);
                    // If item has a key
                    if (assoc.length > 1) { // Add as object item
                      args.push([assoc[0], assoc[1]]);
                    } else { // Add in array
                      args.push([ind++, assoc[0]]);
                    }
                  }
                  return convertObjectFromEntities(args, scope, false, async);
                } else { // It's text command
                  // Parse command
                  return exec(value, scope, true, async);
                }
              } else if (isArray(value)) { // If it's an array of commands
                return convertArray(value, scope, false, async);
              } else if (isFunction(value)) { // If it's a function
                // Execute
                return execFn(value, [], scope, true);
              } else { // Return raw value
                return value;
              }
            }
          },
          order: -800
        },
        isCommand: {
          callback: ({
                       [ConvertProps.context.SCOPE]: scope,
                       [ConvertProps.context.VALUE]: value,
                       [ConvertProps.context.EXEC]: exec
                     }) => {
            // If it's callable
            if (isCommandCallable(value) && exec) {
              // Execute
              return execFn(value, [], scope);
            }
            throw new Continue();
          },
          order: -700
        }
      },
      template: {
        systemConst: {
          regexp: ContentCommands.TPL_XSH_SYSTEM_CONST,
          callback: ({
                       [TemplateProps.context.SCOPE]: scope,
                       [TemplateProps.context.ASYNC]: async,
                     }, match: string, name: string): unknown => {
            const variable = name.at(0) === '_' ? name.toLowerCase() : convertToCamelCase(name, '_');
            const varName = getRunnableVariableName(variable);
            return parse(varName, scope, async);
          },
          order: 9999
        },
        // Parse inline `#xsh` command
        inlineCommand: {
          regexp: ContentCommands.TPL_XSH_INLINE_COMMAND,
          callback:
            ({
               [TemplateProps.context.SCOPE]: scope,
               [TemplateProps.context.ASYNC]: async,
             }, match: string, command: string): unknown => {
              // Remove backslashes
              command = stripSlashes(command);
              // Get command hash
              const varName = getVariableHash(command, true);
              // Wrap to function
              scope[varName] = () => parse(command, scope, async)
              // Return system command name
              return getRunnableConstName(varName, true);
            }
        },
        // Parse XSH variable
        varConst: {
          regexp: ContentCommands.TPL_XSH_VAR_CONST,
          callback:
            ({
               [TemplateProps.context.SCOPE]: scope,
               [TemplateProps.context.ASYNC]: async,
             }, match: string, name: string): string => {
              // Remove backslashes
              const varName = getVariableHash(name, true);
              // Wrap to function
              scope[varName] = () => {
                const variable = name.at(0) === '_' ? name.toLowerCase() : convertToCamelCase(name, '_');
                const varName = getVariableName(variable);
                return parse(varName, scope, async);
              }
              // Return system command name
              return getRunnableConstName(varName, true);
            }
        },
        // Parse XSH running constant
        runConst: {
          regexp: ContentCommands.TPL_XSH_RUN_CONST,
          callback:
            ({
               [TemplateProps.context.SCOPE]: scope,
               [TemplateProps.context.ASYNC]: async,
             }, match: string, name: string): unknown => {
              // Remove backslashes
              const varName = getVariableHash(name, true);
              // Wrap to function
              scope[varName] = () => {
                const variable = name.at(0) === '_' ? name.toLowerCase() : convertToCamelCase(name, '_');
                const varName = getRunnableVariableName(variable);
                return parse(varName, scope, async);
              }
              // Return system command name
              return getRunnableConstName(varName, true);
            }
        }
      },
      parse: {
        // Extract "" and ''
        brackets: {
          regexp: PrepareArguments.BRACKETS,
          callback: ({
                       [RuleProps.context.SCOPE]: scope
                     }, match: string, char: string, text: string): string => {
            // Remove backslashes
            const value = stripSlashes(text);
            // Get value hash
            const name = getVariableHash(value, true);
            scope[name] = value;

            // Return variable name
            return getVariableName(name);
          },
          order: -1000,
        },
        // Remove spaces at the start and the end
        trimBorders: {
          regexp: Trim.BORDERS,
          callback: Literals.EMPTY_STRING,
          order: -900,
        },
        // Remove double spaces
        trimSpaces: {
          regexp: Trim.SPACES,
          callback: CommandDelimiters.PARAM,
          order: -800,
        },
        // Remove spaces around math actions
        trimMath: {
          regexp: Trim.MATH,
          callback: '$1',
          order: -700,
        },
        // Remove spaces around braces
        trimBraces: {
          regexp: Trim.BRACES,
          callback: '$1',
          order: -600,
        },
        // Extract negative numbers
        minus: {
          regexp: PrepareArguments.MINUS,
          callback: ({
                       [RuleProps.context.SCOPE]: scope
                     }, match: string, num: string): string => {
            const value = num;
            // Get value hash
            const name = getVariableHash(value, true);
            if (value.match(TypeChecks.NUMBER)) {
              scope[name] = parseInt(value);
            } else if (value.match(TypeChecks.FLOAT)) {
              scope[name] = parseFloat(value);
            } else {
              console.warn(`Arg "${value}" not parsed to number or float`);
              scope[name] = value;
            }

            // Return variable name
            return getVariableName(name);
          },
          order: -500,
        },
        // Extract value inside braces to variable
        braces: {
          regexp: PrepareArguments.BRACES,
          callback: ({
                       [RuleProps.context.SCOPE]: scope
                     }, match: string): string => {
            const value = match;
            const variable = getVariableHash(value, true);
            scope[variable] = value;

            // Return running constant name
            return getRunnableVariableName(variable);
          },
          order: -400,
        }
      }
    }
  });
}

export default plugin();
