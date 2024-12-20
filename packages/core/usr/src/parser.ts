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

import {getFunction, isString, prepareParam, replacer, replacerAsync} from "@/utilities";
import {convert} from "@/convert";
import {ArgumentCheck, COMMAND_METHOD, ScopeVars} from "@/constants";
import {getRulesByCategory, getRulesByType, RuleCategories, RuleListItem, RuleProps} from "@/rules";
import {Result, Scope} from "@/types";
import {TemplateProps} from "@/templates";

/**
 * Text subcommand
 */
type SubCommandScalar = string;

/**
 * Nested subcommand
 */
type SubCommandComplex = SubCommand[] & {
  [COMMAND_METHOD]: RuleListItem<SubCommandContext, SubCommandMeta>
};

/**
 * Subcommand
 */
type SubCommand = SubCommandScalar | SubCommandComplex;

export const SubCommandProps = {
  ...RuleProps,
  context: {
    ...RuleProps.context,
    /**
     * Subcommand
     */
    SUBCOMMAND: 'subcommand',
    /**
     * Exec
     */
    EXEC: 'exec',
    /**
     * Asynchronously
     */
    ASYNC: 'async',
  }
} as const;

/**
 * Subcommand
 */
export type SubCommandContext = {
  /**
   * Subcommands
   */
  [SubCommandProps.context.SUBCOMMAND]: SubCommand[],
  /**
   * Exec
   */
  [SubCommandProps.context.EXEC]: boolean,
  /**
   * Asynchronously
   */
  [SubCommandProps.context.ASYNC]: boolean
};

/**
 * Subcommand meta
 */
export type SubCommandMeta = NonNullable<unknown>

/**
 * Divides the command into subcommands by literals in order of priority
 * @param command Subcommand
 * @param scope Scope
 * @param index Delimiter index
 */
function parseCommand(command: string, scope: Scope, index = 0): SubCommand {
  command = prepareParam(arguments, 0, ArgumentCheck.STRING);

  const PARSE_COMMAND = getRulesByCategory(RuleCategories.PARSE);
  command = replacer(PARSE_COMMAND, command, {scope});

  const COMMANDS = getRulesByCategory(RuleCategories.COMMAND);
  // If command has current delimiter
  if (index < COMMANDS.length && command.includes(COMMANDS[index].key)) {
    const commands: SubCommandComplex = [] as SubCommandComplex;
    // Add method
    commands[COMMAND_METHOD] = COMMANDS[index];
    // Split into subcommands
    const subcommand = command.split(COMMANDS[index].key);
    for (let i = 0; i < subcommand.length; i++) {
      // Parse each command
      commands[i] = parseCommand(subcommand[i], scope, index + 1);
    }
    return commands;
  } else if (index < COMMANDS.length) { // If delimiter not found
    // Parse next
    return parseCommand(command, scope, index + 1);
  } else { // If no delimiters
    // Return plain text
    return command;
  }
}

/**
 * Execute command synchronously
 * @param subcommand Subcommand
 * @param scope Scope
 * @param exec Execute command
 */
export function execCommandSync<R>(subcommand: SubCommand, scope: Scope = {}, exec = true): R {
  return execCommand<R, false>(subcommand, scope, exec, false);
}

/**
 * Execute command asynchronously
 * @param subcommand Subcommand
 * @param scope Scope
 * @param exec Execute command
 */
export function execCommandAsync<R>(subcommand: SubCommand, scope: Scope = {}, exec = true): Promise<R> {
  return execCommand<R, true>(subcommand, scope, exec, true);
}

/**
 * Execute command
 * @param subcommand Subcommand
 * @param scope Scope
 * @param exec Execute command
 * @param async Asynchronously
 */
function execCommand<R, A extends boolean>(subcommand: SubCommand, scope: Scope = {}, exec = true, async: A): Result<R, A> {
  // If command is string, then convert it
  if (isString(subcommand)) {
    return convert<R, A>(subcommand, scope, exec, async);
  }

  // Get a method
  const rule = subcommand[COMMAND_METHOD];

  const callback = getFunction(rule, async ? [SubCommandProps.ASYNC_CALLBACK, SubCommandProps.CALLBACK] : [SubCommandProps.CALLBACK])

  return callback({
    [SubCommandProps.context.RULE]: rule,
    [SubCommandProps.context.SCOPE]: scope,
    [SubCommandProps.context.SUBCOMMAND]: subcommand,
    [SubCommandProps.context.EXEC]: exec,
    [SubCommandProps.context.ASYNC]: async
  }) as Result<R, A>;
}

/**
 * Parse command
 * @param command Command
 * @param scope Scope
 * @param context Context
 * @param async Asynchronously
 */
export function parse<R, A extends boolean>(command: string, scope: Scope = {}, context: unknown = null, async: A = null): Result<R, A> {
  command = prepareParam(arguments, 0, ArgumentCheck.STRING);
  scope = prepareParam(arguments, 1, ArgumentCheck.OBJECT, {});

  // Add context
  scope[ScopeVars.CONTEXT] = context;

  return exec<R, A>(command, scope, true, async);
}

/**
 * Execute command
 * @param command Command
 * @param scope Scope
 * @param exec Execute command
 * @param async Asynchronously
 */
export function exec<R, A extends boolean>(command: string, scope: Scope = {}, exec = true, async: A = null): Result<R, A> {
  command = prepareParam(arguments, 0, ArgumentCheck.STRING);
  scope = prepareParam(arguments, 1, ArgumentCheck.OBJECT, {});

  // Parse command into subcommands
  const subcommand = parseCommand(command, scope);
  // Exec each subcommand
  return execCommand<R, A>(subcommand, scope, exec, async);
}

/**
 * Parse template
 * @param template Template
 * @param scope Scope
 * @param async Asynchronously
 * @param type Template type
 */
export function parseTemplate<R extends string, A extends boolean>(template: string, type: string, scope: Scope = {}, async: A = null): Result<R, A> {
  template = prepareParam(arguments, 0, ArgumentCheck.STRING);
  type = prepareParam(arguments, 1, ArgumentCheck.STRING);
  scope = prepareParam(arguments, 2, ArgumentCheck.OBJECT, {});

  const replacerFn = async ? replacerAsync : replacer;

  return replacerFn(getRulesByType(RuleCategories.TEMPLATE, type), template, {
    [TemplateProps.context.SCOPE]: scope,
    [TemplateProps.context.TYPE]: type,
    [TemplateProps.context.ASYNC]: async,
  }) as Result<R, A>;
}

