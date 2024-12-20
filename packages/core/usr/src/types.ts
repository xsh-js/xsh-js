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

/**
 * Scope
 */
export type Scope = Record<string, unknown>;

/**
 * Returns synchronous or asynchronous result
 */
export type Result<R, IsAsync> = IsAsync extends true ? Promise<R> : R;

/**
 * Function signature
 */
export type FunctionSignature = (...args: any[]) => unknown;

/**
 * Throw error
 */
export type throwError<M extends string> = M | never;

/**
 * Returns only required object keys
 */
export type RequiredObjectKeys<T> = keyof {
  [K in keyof T as string extends K ? never : number extends K ? never :
    NonNullable<unknown> extends Pick<T, K> ? never : K]: 0
}

/**
 * Returns only optional object keys
 */
export type OptionalObjectKeys<T> = keyof {
  [K in keyof T as string extends K ? never : number extends K ? never :
    NonNullable<unknown> extends Pick<T, K> ? K : never]: 0
}

/**
 * Returns only required tuple keys
 */
export type RequiredTupleKeys<T> = keyof {
  [K in keyof T as K extends `${number}` ? NonNullable<unknown> extends Pick<T, K> ? never : K : never]: 0;
}

/**
 * Returns only optional tuple keys
 */
export type OptionalTupleKeys<T> = keyof {
  [K in keyof T as K extends `${number}` ? NonNullable<unknown> extends Pick<T, K> ? K : never : never]: 0;
}

/**
 * Returns only required array keys
 */
export type RequiredArrayKeys<T> = keyof {
  [K in keyof T as K extends number ? NonNullable<unknown> extends Pick<T, K> ? never : K : never]: 0;
}

/**
 * Returns only optional array keys
 */
export type OptionalArrayKeys<T> = keyof {
  [K in keyof T as K extends number ? NonNullable<unknown> extends Pick<T, K> ? K : never : never]: 0;
}

/**
 * Type with partial keys
 */
export type PartialKey<K extends keyof any, V> = {
  [P in K]?: V
}

/**
 * Type with required keys
 */
export type RequiredKey<K extends keyof any, V> = {
  [P in K]: V
}

/**
 * Make some keys required
 */
export type MakeRequired<V, K extends keyof V> = Omit<V, K> & Required<Pick<V, K>>;
