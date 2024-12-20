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
 * Command method property
 */
export const COMMAND_METHOD = Symbol('$$method');

/**
 * Constants
 */
export const Literals = {
  NULL: 'null',
  UNDEFINED: 'undefined',
  TRUE: 'true',
  FALSE: 'false',
  EMPTY_STRING: '',
}

/**
 * Scope variables
 */
export const ScopeVars = {
  /**
   * Context
   */
  CONTEXT: 'context',
  /**
   * Template
   */
  TEMPLATE: 'template',
  /**
   * Offset
   */
  OFFSET: 'offset',
  /**
   * Template offset
   */
  TEMPLATE_OFFSET: 'templateOffset',
}

/**
 * Types and internal rules
 */
export const ArgumentCheck = {
  ARRAY: ['array'],
  OBJECT: [Object],
  FUNCTION: ['function'],
  STRING: ['string'],
  NUMBER: ['number'],
  REGEXP: [RegExp]
}
