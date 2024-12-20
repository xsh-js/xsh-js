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

import {ValidRule, ValidRules} from "@/config";
import {globalObject} from "@/functions";
import {TemplateContext, TemplateMeta} from "@/templates";
import {SubCommandContext, SubCommandMeta} from "@/parser";
import {ConvertContext, ConvertMeta, MathContext, MathMeta} from "@/convert";

import {MakeRequired, RequiredKey, Scope} from "@/types";

/**
 * Global rule environment variable
 */
export const GLOBAL_RULES_KEY = Symbol("xsh:rules");

/**
 * Rule properties
 */
export const RuleProps = {
  /**
   * Name
   */
  NAME: 'name',
  /**
   * Key
   */
  KEY: 'key',
  /**
   * Regexp
   */
  REGEXP: 'regexp',
  /**
   * Callback function
   */
  CALLBACK: 'callback',
  /**
   * Asynchronously callback function
   */
  ASYNC_CALLBACK: 'callbackAsync',
  /**
   * Meta
   */
  META: 'meta',
  /**
   * Order
   */
  ORDER: 'order',
  context: {
    SCOPE: 'scope',
    TYPE: 'type',
    RULE: 'rule',
    ASYNC: 'async',
  },
  meta: {
    ASYNC: 'async',
    TYPES: 'types',
  }
} as const;

/**
 * Rule context
 */
export type RuleContextObject = {
  [RuleProps.context.SCOPE]: Scope,
  [RuleProps.context.TYPE]?: string
  [RuleProps.context.ASYNC]?: boolean
};

/**
 * Rule meta
 */
export type RuleMetaObject = {
  [RuleProps.meta.ASYNC]?: boolean
  [RuleProps.meta.TYPES]?: string[]
};

/**
 * Rule name
 */
export type RuleName = string;

/**
 * Rule key
 */
export type RuleKey = string;

/**
 * Rule order
 */
export type RuleOrder = number;

/**
 * Rule regexp
 */
export type RuleRegExp = RegExp | RegExp[];

/**
 * Rule context
 */
export type RuleContext<Ctx = NonNullable<unknown>, Meta = NonNullable<unknown>> =
  RuleContextObject
  & Ctx
  & RuleSelfLink<Ctx, Meta>;

/**
 * Rule meta
 */
export type RuleMeta<Meta = NonNullable<unknown>> = RuleMetaObject & Meta;

/**
 * Rule callback function
 */
export type RuleCallback<Ctx = RuleContextObject, Meta = RuleMetaObject> = (context: RuleContext<Ctx, Meta>, ...args: any[]) => unknown;

/**
 * Rule asynchronously callback function
 */
export type RuleCallbackAsync<Ctx = RuleContextObject, Meta = RuleMetaObject> = (context: RuleContext<Ctx, Meta>, ...args: any[]) => Promise<unknown>;

/**
 * Rule list
 */
export type RuleList<Ctx = RuleContextObject, Meta = RuleMetaObject> = RuleListItem<Ctx, Meta>[];

/**
 * Rule self link
 */
export type RuleSelfLink<Ctx = RuleContextObject, Meta = RuleMetaObject> = RequiredKey<typeof RuleProps.context.RULE, RuleListItem<Ctx, Meta>>;

/**
 * Rule list item
 */
export type RuleListItem<Ctx, Meta = NonNullable<unknown>> = {
  /**
   * Name
   */
  [RuleProps.NAME]?: RuleName,
  /**
   * Key
   */
  [RuleProps.KEY]?: RuleKey,
  /**
   * Regexp
   */
  [RuleProps.REGEXP]?: RuleRegExp,
  /**
   * Callback function
   */
  [RuleProps.CALLBACK]: string | RuleCallback<Ctx, Meta>,
  /**
   * Asynchronously callback function
   */
  [RuleProps.ASYNC_CALLBACK]?: RuleCallbackAsync<Ctx, Meta>,
  /**
   * Meta
   */
  [RuleProps.META]?: RuleMeta<Meta> | null,
  /**
   * Order
   */
  [RuleProps.ORDER]?: RuleOrder
};

/**
 * Rule categories
 */
export const RuleCategories = {
  /**
   * Template rules
   */
  TEMPLATE: 'template',
  /**
   * Command rules
   */
  COMMAND: 'command',
  /**
   * Parse rules
   */
  PARSE: 'parse',
  /**
   * Math rules
   */
  MATH: 'math',
  /**
   * Convert rules
   */
  CONVERT: 'convert',
} as const;

/**
 * Global rules
 */
export type GlobalRules = {
  /**
   * Template rules
   */
  [RuleCategories.TEMPLATE]: RuleList<TemplateContext, TemplateMeta>,
  /**
   * Command rules
   */
  [RuleCategories.COMMAND]: RuleList<SubCommandContext, SubCommandMeta>,
  /**
   * Math rules
   */
  [RuleCategories.MATH]: RuleList<MathContext, MathMeta>,
  /**
   * Convert rules
   */
  [RuleCategories.CONVERT]: RuleList<ConvertContext, ConvertMeta>,
  /**
   * Parse rules
   */
  [RuleCategories.PARSE]: RuleList,
}

/**
 * Global rules
 */
globalObject[GLOBAL_RULES_KEY] = [];

/**
 * Register rules
 * @param category Category
 * @param rules Rule list
 */
export function registerRules<Item, CategoryKey extends keyof GlobalRules, Category extends (GlobalRules[CategoryKey][number] extends RuleListItem<infer Context, infer Meta> ? {
  context: Context,
  meta: Meta
} : never)>(category: CategoryKey, rules: ValidRules<Category['context'], Category['meta'], Item>): void {
  globalObject[GLOBAL_RULES_KEY][category] ??= [];
  globalObject[GLOBAL_RULES_KEY][category].push(...Object.values(rules));
  globalObject[GLOBAL_RULES_KEY][category].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Register rule
 * @param category Category
 * @param rule Rule
 */
export function registerRule<Item, CategoryKey extends keyof GlobalRules, Category extends (GlobalRules[CategoryKey][number] extends RuleListItem<infer Context, infer Meta> ? {
  context: Context,
  meta: Meta
} : never)>(category: CategoryKey, rule: MakeRequired<ValidRule<Category['context'], Category['meta'], Item>, typeof RuleProps.NAME>): void {
  globalObject[GLOBAL_RULES_KEY][category] ??= [];
  globalObject[GLOBAL_RULES_KEY][category].push(rule);
  globalObject[GLOBAL_RULES_KEY][category].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Returns rules filtered by type and category
 * @param category Category
 * @param type Type
 */
export function* getRulesByType<CategoryKey extends keyof GlobalRules>(category: CategoryKey, type: string): Generator<GlobalRules[CategoryKey][number]> {
  const RULES = getRulesByCategory(category);
  for (const rule of RULES) {
    if (rule.meta?.types == null || rule.meta?.types?.includes(type)) {
      yield rule;
    }
  }
}

/**
 * Returns category rules
 * @param category Category
 */
export function getRulesByCategory<CategoryKey extends keyof GlobalRules>(category: CategoryKey): GlobalRules[CategoryKey] {
  globalObject[GLOBAL_RULES_KEY][category] ??= [];
  return globalObject[GLOBAL_RULES_KEY][category];
}
