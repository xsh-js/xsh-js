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

import {addCommand, CommandProperties, ValidCommands} from "@/commands";
import {GlobalRules, registerRules, RuleList, RuleListItem, RuleSelfLink} from "@/rules";
import {PartialKey} from "@/types";

/**
 * Validate rules
 */
export type ValidRules<TContext, TMeta, TRules> = {
  [key in keyof TRules & string]: Omit<ValidRule<TContext, TMeta, TRules[key]>, 'name'> & PartialKey<'name', key>
}
/**
 * Validate rule
 */
export type ValidRule<TContext, TMeta, TRule> = RuleListItem<TContext & RuleSelfLink<TContext, TRule>, TMeta & TRule>

/**
 * Validate config
 */
export type ValidConfig<TCommands, TRules extends Partial<Record<keyof GlobalRules, unknown>>> = {
  commands?: ValidCommands<TCommands>,
  rules?: {
    [key in keyof GlobalRules]?: GlobalRules[key] extends RuleList<infer Ctx, infer Meta> ? ValidRules<Ctx, Meta, TRules[key]>
      : never
  },
  plugins?: ValidConfig<Record<string, any>, Partial<Record<keyof GlobalRules, any>>>[]
}

/**
 * Set config of rules and commands
 * @param config Config
 */
export function setConfig<TCommands, TTemplateRules, TConvertRules, TMathRules, TCommandRules, TParseRules>(config: ValidConfig<TCommands, {
  template: TTemplateRules,
  convert: TConvertRules,
  command: TCommandRules,
  math: TMathRules,
  parse: TParseRules
}>): void {
  config = validateConfig(config);

  for (const plugin of config.plugins ?? []) {
    setConfig(plugin);
  }

  for (const key in config.commands) {
    if (!Object.hasOwn(config.commands, key)) {
      continue;
    }
    config.commands[key][CommandProperties.NAME] = key;
    addCommand(config.commands[key])
  }

  for (const category in config.rules) {
    if (!Object.hasOwn(config.rules, category)) {
      continue;
    }
    registerRules(category as keyof GlobalRules, config.rules[category]);
  }
}

/**
 * Returns validated config
 * @param config Config
 */
export function validateConfig<TCommands, TTemplateRules, TConvertRules, TMathRules, TCommandRules, TParseRules>(config: ValidConfig<TCommands, {
  template: TTemplateRules,
  convert: TConvertRules,
  command: TCommandRules,
  math: TMathRules,
  parse: TParseRules
}>): ValidConfig<TCommands, {
  template: TTemplateRules,
  convert: TConvertRules,
  command: TCommandRules,
  math: TMathRules,
  parse: TParseRules
}> {
  return config;
}
