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

import {
  ArgumentsLengthInvalidError,
  AssertFailedError,
  ParameterTypeInvalidError,
  PropertyNotFoundError,
  PropertyTypeMismatchError,
  VariableTypeInvalidError
} from "@/exceptions";
import {error} from "@/functions";
import {ArgumentCheck} from "@/constants";
import {RuleContext, RuleListItem, RuleProps} from "@/rules";
import {FunctionSignature, Result} from "@/types";

/**
 * Assert value to null
 * @param value Value
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Assert value to string
 * @param value Value
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Assert value to function
 * @param value Value
 */
export function isFunction(value: unknown): value is FunctionSignature | NewableFunction {
  return typeof value === 'function';
}

/**
 * Assert value to array
 * @param value Value
 */
export function isArray<T = unknown>(value: unknown): value is Array<T> {
  return Array.isArray(value);
}

/**
 * Assert value to object
 * @param value Value
 */
export function isObject(value: unknown): value is object {
  return value instanceof Object;
}

/**
 * Assert value to promise
 * @param value Value
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return value instanceof Promise;
}

/**
 * Asset value to regexp
 * @param value Value
 */
export function isRegexp(value: unknown): value is typeof RegExp {
  return value instanceof RegExp;
}

/**
 * Asset value to empty string
 * @param value Value
 * @param trim Trim spaces
 */
export function isEmptyString(value: unknown, trim = false): boolean {
  return isString(value) && trim ? value.trim() === "" : value === "";
}

/**
 * Returns true if object has non-null property
 * @param obj Object
 * @param key Key
 */
export function hasProperty<O extends object, K extends keyof any>(obj: O, key: K): K extends keyof O ? true : false {
  return (obj[key as keyof any] != null) as K extends keyof O ? true : false;
}

/**
 * Prepare array parameter.
 * Returns parameter (by index) value or default value,
 * if it corresponds to at least one of the passed types
 * @throws ParameterTypeInvalidError
 * @throws ArgumentsLengthInvalidError
 * @throws AssertFailedError
 * @param args Array
 * @param ind Index
 * @param types Type array
 * @param defaultValue Default value
 */
export function prepareParam<A extends ArrayLike<any>, I extends keyof A & number, T extends A[I] = A[I]>(args: A, ind: I, types: unknown[], defaultValue?: T): T {
  try {
    checkType<T>(args[ind] ?? defaultValue, types);
  } catch (e: unknown) {
    if (e instanceof AssertFailedError) {
      error(new ParameterTypeInvalidError({
        arguments: args,
        param: ind,
        type: e.payload.type
      }))
    }
    throw e;
  }
  return args[ind] ?? defaultValue;
}

/**
 * Checks whether the value of an object property matches the specified types.
 * Returns the value of the first non-null property (or the default value),
 * if it corresponds to at least one of the passed types
 * @throws PropertyTypeMismatchError
 * @throws ParameterTypeInvalidError
 * @throws ArgumentsLengthInvalidError
 * @throws AssertFailedError
 * @param obj Object
 * @param props One property or property array
 * @param types Type array
 * @param defaultValue Default value
 */
export function prepareProperty<T, O extends object, K extends keyof O = keyof O>(obj: O, props: K | K[], types: unknown[], defaultValue?: T): T {
  let value: T;
  let key: string;
  try {
    if (!isArray(props)) {
      props = [props];
    }
    for (const prop of props) {
      value ??= obj[prop] as T;
      if (value != null) {
        key = prop as string;
      }
    }
    if (key == null) {
      key = props[props.length - 1] as string;
    }
    value ??= defaultValue;
    checkType<T>(value, types);
  } catch (e: unknown) {
    if (e instanceof AssertFailedError) {
      error(new PropertyTypeMismatchError({
        object: obj as Record<string, unknown>,
        property: key as string,
        type: e.payload.type
      }))
    }
    throw e;
  }
  return value as T;
}

/**
 * Checks if the object property exists.
 * Generates an exception if the property does not exist in the object
 * @throws PropertyNotFoundError
 * @param obj Object
 * @param prop Property
 * @param skipEmpty Skip null and undefined properties
 */
export function checkProperty<O extends object, K extends keyof O & string = keyof O & string>(obj: O, prop: K, skipEmpty =
  false): void | never {
  if (!Object.hasOwn(obj, prop) || (!skipEmpty && obj[prop] == null)) {
    error(new PropertyNotFoundError({
      object: obj,
      property: prop
    }))
  }
}

/**
 * Returns the object property if it is present in the object and not null
 * @throws PropertyNotFoundError
 * @param obj Object
 * @param prop Property
 */
export function getProperty<T extends O[K], O extends object, K extends keyof O & string = keyof O & string>(obj: O, prop: K): NonNullable<T> {
  checkProperty(obj, prop);
  return obj[prop] as NonNullable<T>;
}

/**
 * Checks if the variable value matches the specified types.
 * Generates an exception if the value does not match any of the passed types
 * @throws ParameterTypeInvalidError
 * @throws ArgumentsLengthInvalidError
 * @throws AssertFailedError
 * @param value Value
 * @param types Type rule
 */
export function checkType<T>(value: unknown, types: unknown[]): asserts value is T {
  isArray(types) || error(new ParameterTypeInvalidError({
    arguments,
    param: 1,
    type: 'Array',
  }));

  types.length > 0 || error(new ArgumentsLengthInvalidError({
    args: types,
    condition: 'greater than',
    length: 0,
  }));

  for (const type of types) {
    if (isString(type)) {
      if (type === 'null') {
        if (value == null) {
          return;
        }
        continue;
      }
      if (type === 'array') {
        if (isArray(value)) {
          return;
        }
        continue;
      }
      if (typeof value === type) {
        return;
      }
    } else if (isFunction(type)) {
      if (value instanceof (type as NewableFunction)) {
        return;
      }
    } else {
      error(new VariableTypeInvalidError({
        type: 'string | function',
        value: type
      }))
    }
  }
  error(new AssertFailedError({
    value,
    type: types.join(' | ')
  }))
}

/**
 * Retrieve callable function.
 * Will return a callable function if the object property is a function.
 * this will point to the object
 * @throws ParameterTypeInvalidError
 * @throws ArgumentsLengthInvalidError
 * @throws AssertFailedError
 * @throws PropertyTypeMismatchError
 * @param obj Object
 * @param fn Function name
 * @param defaultValue Default function
 */
export function getFunction<O extends object, K extends keyof O, V extends O[K]>(obj: O, fn: K | K[], defaultValue?: O[K]): V extends FunctionSignature ? V : never {
  fn = prepareParam(arguments, 1, [...ArgumentCheck.STRING, ...ArgumentCheck.NUMBER, ...ArgumentCheck.ARRAY]);
  const func = prepareProperty(obj, fn, ArgumentCheck.FUNCTION, defaultValue);

  // Wrap the function so that it can be called with different this
  return function (this: unknown, ...args: unknown[]) {
    return (func as FunctionSignature).apply(this ?? obj, args);
  } as V extends FunctionSignature ? V : never;
}

/**
 * Return the array of resolved Promise
 * @param map Promise array
 * @param waitPrevious Wait previous
 */
async function waitMap<T>(map: Promise<T>[], waitPrevious = false): Promise<T[]> {
  if (!waitPrevious) {
    return Promise.all(map);
  }
  const res: T[] = [];
  for (const item of map) {
    res.push(await item);
  }
  return res;
}

/**
 * Synchronous function called when replacing a substring in the text
 */
type ReplacerCallbackSync = (match: string, ...args: unknown[]) => string;
/**
 * Asynchronous function called when replacing a substring in the text
 */
type ReplacerCallbackAsync = (match: string, ...args: unknown[]) => Promise<string>;
/**
 * Function called when replacing a substring in the text
 */
type ReplacerCallback = ReplacerCallbackSync | ReplacerCallbackAsync;
/**
 * Result of substring replacement function in text
 */
type ReplacerResult<R> = Result<string, R extends ReplacerCallbackAsync ? true : false>;


/**
 * Replaces the substring in a string
 * @throws ParameterTypeInvalidError
 * @throws ArgumentsLengthInvalidError
 * @throws AssertFailedError
 * @param inputString Input string
 * @param searchValue String or regexp
 * @param replacer Replace function
 * @param waitPrevious Wait previous
 */
export function replace<R extends string | ReplacerCallback>(inputString: string, searchValue: string | RegExp, replacer: R, waitPrevious = true): ReplacerResult<R> {
  inputString = prepareParam(arguments, 0, ArgumentCheck.STRING);
  searchValue = prepareParam(arguments, 1, [...ArgumentCheck.STRING, ...ArgumentCheck.REGEXP]);
  replacer = prepareParam(arguments, 2, [...ArgumentCheck.STRING, ...ArgumentCheck.FUNCTION]);

  // If replacer is function
  if (isFunction(replacer)) {
    const values: (string | Promise<string>)[] = [];
    // If there is one Promise, then the result will also be a Promise
    let hasPromised = false;
    const replacedString = inputString.replace(searchValue as string, (match: string, ...args: unknown[]): string => {
      const res: string | Promise<string> = replacer(match, ...args);
      values.push(res);
      if (isPromise(res)) {
        hasPromised = true;
        return "";
      }
      return res as string;
    });
    if (hasPromised) {
      return waitMap(values as Promise<string>[], waitPrevious).catch((error) => {
        throw error;
      }).then((resolvedValues: string[]) => inputString.replace(searchValue, () => resolvedValues.shift() as string)) as ReplacerResult<R>;
    }
    return replacedString as ReplacerResult<R>;
  } else {
    return inputString.replace(searchValue, replacer) as ReplacerResult<R>;
  }
}

/**
 * Synchronously processes a string according to a set of rules
 * @throws ParameterTypeInvalidError
 * @throws ArgumentsLengthInvalidError
 * @throws AssertFailedError
 * @param rules Rule list
 * @param inputString Input string
 * @param context Context
 */
export function replacer<Ctx, Meta>(rules: Iterable<RuleListItem<Ctx, Meta>>, inputString: string, context: Omit<RuleContext<Ctx>, 'rule'>): string {
  rules = prepareParam(arguments, 0, [...ArgumentCheck.ARRAY, ...ArgumentCheck.OBJECT]);
  inputString = prepareParam(arguments, 1, ArgumentCheck.STRING);

  for (const rule of rules) {
    let regexp = prepareProperty<RegExp | Array<RegExp>, typeof rule>(rule, RuleProps.REGEXP, [...ArgumentCheck.REGEXP, ...ArgumentCheck.ARRAY]);
    const callback = prepareProperty<string | FunctionSignature, typeof rule>(rule, RuleProps.CALLBACK, [...ArgumentCheck.STRING, ...ArgumentCheck.FUNCTION]);
    if (!isArray(regexp)) {
      regexp = [regexp];
    }

    if (isFunction(callback)) {
      for (const expr of regexp) {
        inputString = replace(inputString, expr, callback.bind(null, {
          ...context,
          [RuleProps.context.RULE]: rule
        }) as () => string);
      }
    } else if (isString(callback)) {
      for (const expr of regexp) {
        inputString = replace(inputString, expr, callback);
      }
    }
  }
  return inputString;
}

/**
 * Asynchronously processes a string according to a set of rules
 * @throws ParameterTypeInvalidError
 * @throws ArgumentsLengthInvalidError
 * @throws AssertFailedError
 * @param rules Rule list
 * @param inputString Input string
 * @param context Context
 */
export async function replacerAsync<Ctx, Meta>(rules: Iterable<RuleListItem<Ctx, Meta>>, inputString: string, context: Omit<RuleContext<Ctx>, 'rule'>): Promise<string> {
  rules = prepareParam(arguments, 0, [...ArgumentCheck.ARRAY, ...ArgumentCheck.OBJECT]);
  inputString = prepareParam(arguments, 1, ArgumentCheck.STRING);

  for (const rule of rules) {
    let regexp = prepareProperty<RegExp | Array<RegExp>, typeof rule>(rule, RuleProps.REGEXP, [...ArgumentCheck.REGEXP, ...ArgumentCheck.ARRAY]);
    const callback = prepareProperty<string | FunctionSignature, typeof rule>(rule, [RuleProps.ASYNC_CALLBACK, RuleProps.CALLBACK], [...ArgumentCheck.STRING, ...ArgumentCheck.FUNCTION]);

    if (!isArray(regexp)) {
      regexp = [regexp];
    }

    if (isFunction(callback)) {
      for (const expr of regexp) {
        inputString = await replace(inputString, expr, callback.bind(null, {
          ...context,
          [RuleProps.context.RULE]: rule
        }) as () => Promise<string>);
      }
    } else if (isString(callback)) {
      for (const expr of regexp) {
        inputString = replace(inputString, expr, callback);
      }
    }
  }
  return inputString;
}
