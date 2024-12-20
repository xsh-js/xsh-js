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

import {getFunction, prepareParam} from "@/utilities";
import {Continue} from "@/exceptions";
import {ArgumentCheck} from "@/constants";
import {getRulesByCategory, RuleCategories, RuleListItem, RuleProps} from "@/rules";
import {Result, Scope} from "@/types";

/**
 * Math context properties
 */
export const MathProps = {
  ...RuleProps,
  context: {
    ...RuleProps.context,
    /**
     * Left operand
     */
    OPERAND1: 'operand1',
    /**
     * Right operant
     */
    OPERAND2: 'operand2'
  }
} as const;

/**
 * Math context
 */
export type MathContext = {
  /**
   * Left operand
   */
  [MathProps.context.OPERAND1]: unknown,
  /**
   * Right operant
   */
  [MathProps.context.OPERAND2]: unknown
}

/**
 * Math meta
 */
export type MathMeta = NonNullable<unknown>;

/**
 * Parse math operation
 * @param rule Rule
 * @param operands Operands
 * @param scope Scope
 */
export function parseMath(rule: RuleListItem<MathContext, MathMeta>, operands: unknown[], scope: Scope): unknown {
  operands = prepareParam(arguments, 1, ArgumentCheck.ARRAY);

  const callback = getFunction(rule, MathProps.CALLBACK);

  let res = operands[0];
  for (let i = 1; i < operands.length; i++) {
    try {
      res = callback({
        [MathProps.context.RULE]: rule,
        [MathProps.context.SCOPE]: scope,
        [MathProps.context.OPERAND1]: res,
        [MathProps.context.OPERAND2]: operands[i]
      });
    } catch (e: unknown) {
      if (e instanceof Continue) {
        // If payload exists, use it as next left operand or result
        if (e.payload !== undefined) {
          res = e.payload as string
        }
        continue;
      }
      throw e;
    }
  }

  return res;
}

/**
 * Convert context properties
 */
export const ConvertProps = {
  ...RuleProps,
  context: {
    ...RuleProps.context,
    /**
     * Value
     */
    VALUE: 'value',
    /**
     * Exec command
     */
    EXEC: 'exec',
    /**
     * Asynchronously
     */
    ASYNC: 'async'
  }
} as const;

/**
 * Convert context
 */
export type ConvertContext = {
  /**
   * Value
   */
  [ConvertProps.context.VALUE]: string,
  /**
   * Exec command
   */
  [ConvertProps.context.EXEC]: boolean,
  /**
   * Asynchronously
   */
  [ConvertProps.context.ASYNC]: boolean
};

/**
 * Convert meta
 */
export type ConvertMeta = NonNullable<unknown>;

/**
 * Convert value synchronously
 * @param value Value
 * @param scope Scope
 * @param exec Execute commands
 */
function convertSync<R>(value: string, scope: Scope, exec = true): R {
  const CONVERT = getRulesByCategory(RuleCategories.CONVERT);
  for (const rule of CONVERT) {
    try {
      const callback = getFunction(rule, ConvertProps.CALLBACK);

      return callback({
        [ConvertProps.context.RULE]: rule,
        [ConvertProps.context.SCOPE]: scope,
        [ConvertProps.context.EXEC]: exec,
        [ConvertProps.context.VALUE]: value,
        [ConvertProps.context.ASYNC]: false
      }) as R;
    } catch (e: unknown) {
      if (e instanceof Continue) {
        // If payload exists, use it as next left operand or result
        if (e.payload !== undefined) {
          value = e.payload as string
        }
        continue;
      }
      throw e;
    }
  }
  return value as R;
}

/**
 * Convert value asynchronously
 * @param value Value
 * @param scope Scope
 * @param exec Execute commands
 */
async function convertAsync<R>(value: string, scope: Scope, exec = true): Promise<R> {
  const CONVERT = getRulesByCategory(RuleCategories.CONVERT);
  for (const rule of CONVERT) {
    try {
      const callback = getFunction(rule, rule.callbackAsync != null
        ? [ConvertProps.ASYNC_CALLBACK, ConvertProps.CALLBACK]
        : ConvertProps.CALLBACK);

      return await callback({
        [ConvertProps.context.RULE]: rule,
        [ConvertProps.context.SCOPE]: scope,
        [ConvertProps.context.EXEC]: exec,
        [ConvertProps.context.VALUE]: value,
        [ConvertProps.context.ASYNC]: true
      }) as Promise<R>;
    } catch (e: unknown) {
      if (e instanceof Continue) {
        // If payload exists, use it as next left operand or result
        if (e.payload !== undefined) {
          value = e.payload as string
        }
        continue;
      }
      throw e;
    }
  }
  return value as unknown as Promise<R>;
}

/**
 * Convert value
 * @param value Value
 * @param scope Scope
 * @param exec Execute commands
 * @param async Asynchronously
 */
export function convert<R, A extends boolean>(value: string, scope: Scope, exec = true, async: A = null): Result<R, A> {
  return (async
    ? convertAsync<R>(value, scope, exec)
    : convertSync<R>(value, scope, exec)) as Result<R, A>;
}

/**
 * Convert array
 * @param arr Array
 * @param scope Scope
 * @param exec Execute commands
 * @param async Asynchronously
 */
export function convertArray<T, A extends boolean>(arr: T[], scope: Scope, exec = true, async: A = null): Result<T[], A> {
  arr = prepareParam(arguments, 0, ArgumentCheck.ARRAY);

  const res: unknown[] = [];
  for (const item of arr) {
    // Put converted value
    res.push(convert(item as string, scope, exec, async));
  }
  return (async
    ? Promise.all(res)
    : res) as Result<T[], A>;
}

/**
 * Convert named array
 * @param obj Object
 * @param scope Scope
 * @param exec Execute commands
 * @param async Asynchronously
 */
export function convertObject<A extends boolean>(obj: Record<string, unknown>, scope: Scope, exec = true, async: A = null): Result<Record<string, unknown>, A> {
  obj = prepareParam(arguments, 0, ArgumentCheck.OBJECT);
  return convertObjectFromEntities(Object.entries(obj), scope, exec, async);
}

/**
 * Create object from entities
 * @param arr Entities
 * @param scope Scope
 * @param exec Execute commands
 * @param async Asynchronously
 */
export function convertObjectFromEntities<A extends boolean>(arr: ([unknown, unknown])[], scope: Scope, exec = true, async: A = null): Result<Record<string, unknown>, A> {
  arr = prepareParam(arguments, 0, ArgumentCheck.ARRAY);

  const res: ([unknown, unknown])[] = [];
  for (const item of arr) {
    // Put converted value
    res.push(convertEntityItem(item, scope, exec, async) as [unknown, unknown]);
  }
  return (async
    ? Promise.all(res).then(obj => Object.fromEntries(obj))
    : Object.fromEntries(res)) as Result<Record<string, unknown>, A>;
}

/**
 * Convert entity items
 * @param item Item
 * @param scope Scope
 * @param exec Execute commands
 * @param async Asynchronously
 */
function convertEntityItem<A extends boolean>(item: [unknown, unknown], scope: Scope, exec = true, async: A = null): Result<[unknown, unknown], A> {
  item = prepareParam(arguments, 0, ArgumentCheck.ARRAY);

  item[0] = convert(item[0] as string, scope, exec, async);
  item[1] = convert(item[1] as string, scope, exec, async);
  return (async ? Promise.all(item) : item) as Result<[unknown, unknown], A>;
}
