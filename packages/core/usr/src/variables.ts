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

import {error, globalObject, md5} from "@/functions";
import {getFunction, getProperty, isArray, isFunction, isPromise, prepareParam} from "@/utilities";
import {PropertyTypeMismatchError} from "@/exceptions";
import {ArgumentCheck} from "@/constants";
import {Scope} from "@/types";

/**
 * Prefixes
 */
const Prefixes = {
  /**
   * Variable
   */
  VAR: '$',
  /**
   * System variable (2nd char)
   */
  SYSTEM_VAR: '_',
}

/**
 * Global variables key
 */
const GLOBAL_VARS_KEY = Symbol("xsh:vars");

/**
 * Global variable of global variables
 */
globalObject[GLOBAL_VARS_KEY] = {
  global: globalObject
};

/**
 * Variables
 */
const VARS = globalObject[GLOBAL_VARS_KEY];

/**
 * Returns the value of the variable by name or the default value if null.
 * If an array is passed as the name, the variable will be found at the 0-th index, and further
 * the value of each next index from the original variable will be retrieved.
 * If at least one nested element is Promise, Promise will be returned.
 * @throws ParameterTypeInvalidError
 * @throws ArgumentsLengthInvalidError
 * @throws AssertFailedError
 * @throws PropertyTypeMismatchError
 * @param name Variable name, or string[] with nesting specified
 * @param scope Scope
 * @param defaultValue Default value
 */
export function getVar<R>(name: string | string[], scope: Scope = {}, defaultValue?: Awaited<R>): R {
  name = prepareParam(arguments, 0, [...ArgumentCheck.STRING, ...ArgumentCheck.ARRAY]);
  if (isArray(name)) {
    let res = getVar(name[0], scope, defaultValue);

    // Get nested level
    const cnt = name.length;
    for (let i = 1; i < cnt; i++) {
      const key = name[i];
      // If the result is Promise, then return only Promise
      if (isPromise(res)) {
        res = res.then((res) => {
          if (res == null) {
            return res;
          }

          const item = res[key];

          if (item == null) {
            return item;
          }

          if (isFunction(item)) {
            return getFunction(res as Record<string, unknown>, key);
          }

          return item;
        }) as R;
        continue;
      }

      // If the result is already null, there is no point in going any further
      if (res == null) {
        return res ?? defaultValue;
      }

      // Get the key
      const item = res[key];

      // If the result is already null, there is no point in going any further
      if (item == null) {
        return item ?? defaultValue;
      }

      // If it is a function of an object, sets this to that object
      if (isFunction(item)) {
        res = getFunction(res as Record<string, unknown>, key as string) as R;
      } else { // Get nested object
        res = item;
      }
    }

    // If result is Promise, return the default value if it's null.
    // Also generate an error
    if (isPromise(res)) {
      return res.then((res) => {
        return res ?? defaultValue;
      }).catch(error) as R
    }

    return res ?? defaultValue;
  }
  return scope[name] ?? VARS[name] ?? defaultValue;
}

/**
 * Set variable
 * @param name Name
 * @param value Value
 */
export function setVar(name: string | number | string[] | number[], value: unknown): void {
  name = prepareParam(arguments, 0, [...ArgumentCheck.STRING, ...ArgumentCheck.NUMBER, ...ArgumentCheck.ARRAY]);

  if (isArray(name)) {
    let res = VARS[name[0]];
    // Set a value in Promise property is not allowed
    if (isPromise(res)) {
      error(new PropertyTypeMismatchError({
        object: VARS,
        property: name[0] as string,
        type: 'not a Promise'
      }));
    }
    // Get nested level
    const cnt = name.length;
    for (let i = 1; i < cnt - 1; i++) {
      const key = name[i];
      // Get the key
      const item = getProperty(res, key as string);
      if (isPromise(res)) {
        error(new PropertyTypeMismatchError({
          object: res,
          property: key as string,
          type: 'not a Promise'
        }));
      }
      // If it is a function of an object, sets this to that object
      if (isFunction(item)) {
        res = getFunction(res as Record<string, unknown>, key as string);
      } else { // Get nested object
        res = item;
      }
    }

    res[name[cnt - 1]] = value;
  } else {
    VARS[name] = value;
  }
  return;
}

/**
 * Returns true if input string is variable
 * @param inputString Input string
 */
export function isVariable(inputString: string): boolean {
  return inputString.startsWith(Prefixes.VAR);
}

/**
 * Returns true if input string is running variable
 * @param inputString Input string
 */
export function isRunnableVariable(inputString: string): boolean {
  return inputString.startsWith(Prefixes.VAR + Prefixes.VAR);
}

/**
 * Returns the hash of the source string as a variable name (without the variable prefix)
 * @param inputString Input string
 * @param isSystem Is system variable
 */
export function getVariableHash(inputString: string, isSystem = false): string {
  return (isSystem ? Prefixes.SYSTEM_VAR : '') + md5(inputString);
}

/**
 * Returns variable name with prefix
 * @param name Input string
 */
export function getVariableName(name: string): string {
  return Prefixes.VAR + name;
}

/**
 * Returns running variable name with prefix
 * @param name Input string
 */
export function getRunnableVariableName(name : string): string {
  return Prefixes.VAR + Prefixes.VAR + name;
}

/**
 * Returns constant name
 * @param name Input string
 */
export function getConstName(name : string): string {
  return `__XSH_VAR_${name.toUpperCase()}__`;
}

/**
 * Returns running constant name
 * @param name Input string
 * @param isSystem Is system variable
 */
export function getRunnableConstName(name : string, isSystem = false): string {
  return `__XSH_${isSystem ? 'SYSTEM' : 'RUN'}_${name.toUpperCase()}__`;
}
