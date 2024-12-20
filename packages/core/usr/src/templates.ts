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

import {RuleProps} from "@/rules";

/**
 * Template properties
 */
export const TemplateProps = {
  ...RuleProps
} as const;

/**
 * Template context
 */
export type TemplateContext = {
  /**
   * Type
   */
  [TemplateProps.context.TYPE]: string,
  /**
   * Asynchronously
   */
  [TemplateProps.context.ASYNC]: boolean
};

/**
 * Template meta
 */
export type TemplateMeta = {
  /**
   * Type
   */
  [TemplateProps.meta.TYPES]: string[]
};
