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

import {convertToCamelCase, error, globalObject} from "@/functions";
import {checkProperty, getProperty, hasProperty, isFunction, isString, prepareParam} from "@/utilities";
import {ArgumentsLengthInvalidError, WrongArgumentPositionError, PropertyRequiredError} from "@/exceptions";
import {ArgumentCheck} from "@/constants";
import {FunctionSignature, PartialKey, Scope} from "@/types";

/**
 * Command list global variable
 */
const GLOBAL_COMMANDS_KEY = Symbol("xsh:commands");

globalObject[GLOBAL_COMMANDS_KEY] = {};

/**
 * Command properties
 */
export const CommandProperties = {
  /**
   * Name
   */
  NAME: 'name',
  /**
   * Callback function
   */
  CALLBACK: 'callback',
  /**
   * Argument array
   */
  ARGS: 'args',
  /**
   * Argument named array
   */
  NAMED_ARGS: 'namedArgs',
  /**
   * Array of flags.
   * {
   *   [a-Z{1}]: [0-9]+
   * }
   */
  FLAGS: 'flags',
} as const;

/**
 * Command's argument properties
 */
export const CommandArgProperties = {
  /**
   * Argument index
   */
  INDEX: 'ind',
  /**
   * Name
   */
  NAME: 'name',
  /**
   * Is required
   */
  REQUIRED: 'required',
  /**
   * Is not null
   */
  NOT_NULL: 'notNull',
  /**
   * Default value
   */
  DEFAULT: 'default',
  /**
   * Is variadic
   */
  VARIADIC: 'variadic',
  /**
   * Mode
   */
  MODE: 'mode',
  /**
   * Scope
   */
  SCOPE: 'scope',
} as const;

/**
 * Command's argument
 */
type CommandArg<Type = unknown> = {
  /**
   * Name
   */
  [CommandArgProperties.NAME]: string,
  /**
   * Is required
   */
  [CommandArgProperties.REQUIRED]?: boolean,
  /**
   * Is not null
   */
  [CommandArgProperties.NOT_NULL]?: boolean,
  /**
   * Is variadic
   */
  [CommandArgProperties.VARIADIC]?: boolean,
  /**
   * Default value
   */
  [CommandArgProperties.DEFAULT]?: Type,
};

/**
 * Command's callback function
 */
type CommandCallback = FunctionSignature;

/**
 * Array of command arguments
 */
type CommandArgsArray<A extends unknown[]> = {
  [K in keyof A]-?: CommandArg<A[K]>
};

/**
 * Named array of command arguments
 */
type CommandArgsObject = Record<string, CommandArg & {
  /**
   * Argument index
   */
  [CommandArgProperties.INDEX]: number
}>;

/**
 * Command
 */
export type Command<Callback extends CommandCallback = CommandCallback> = {
  /**
   * Name
   */
  [CommandProperties.NAME]: string,
  /**
   * Callback function
   */
  [CommandProperties.CALLBACK]: Callback,
  /**
   * Flags.
   * {
   *   [a-Z{1}]: [0-9]+
   * }
   */
  [CommandProperties.FLAGS]?: Record<string, number>;
  /**
   * Argument array
   */
  [CommandProperties.ARGS]: CommandArgsArray<Parameters<Callback>> & Array<CommandArg>
};

/**
 * Compiled command
 */
type CompiledCommand = {
  /**
   * Name
   */
  [CommandProperties.NAME]: string,
  /**
   * Callback function
   */
  [CommandProperties.CALLBACK]: CommandCallback,
  /**
   * Flags.
   * {
   *   [a-Z{1}]: [0-9]+
   * }
   */
  [CommandProperties.FLAGS]: Record<string, number>;
  /**
   * Argument array
   */
  [CommandProperties.ARGS]: CommandArg[],
  /**
   * Argument named array
   */
  [CommandProperties.NAMED_ARGS]: CommandArgsObject
}

/**
 * Validate command array
 */
export type ValidCommands<TCommands> = {
  [key in keyof TCommands & string]: TCommands[key] extends FunctionSignature
    ? ValidCommand<key, TCommands[key]>
    : never
};

/**
 * Validate command properties
 */
export type ValidCommand<TKey extends string, TCommand extends FunctionSignature> =
  Omit<Command<TCommand>, typeof CommandProperties.NAME>
  & PartialKey<typeof CommandProperties.NAME, TKey>;

/**
 * Command storage
 */
const COMMANDS: Record<string, CompiledCommand> = globalObject[GLOBAL_COMMANDS_KEY];

/**
 * Add command to storage
 * @param command Command
 */
export function addCommand<Callback extends CommandCallback>(command: Command<Callback>): void {
  const compiledCommand: CompiledCommand = {
    // default args and flags if they not exist
    [CommandProperties.ARGS]: [],
    [CommandProperties.FLAGS]: {},
    // add command fields
    ...command,
    // override named args
    [CommandProperties.NAMED_ARGS]: {}
  }
  const args = command[CommandProperties.ARGS] ?? [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    compiledCommand[CommandProperties.NAMED_ARGS][arg[CommandArgProperties.NAME]] = {
      ...arg,
      [CommandArgProperties.INDEX]: i
    };
  }
  COMMANDS[compiledCommand[CommandArgProperties.NAME]] = compiledCommand;
}

/**
 * Returns true if command exists and callback is callable
 * @param commandName Command name
 */
export function isCommandCallable(commandName: string): boolean {
  return isString(commandName) && hasProperty(COMMANDS, commandName) && isFunction(COMMANDS[commandName][CommandProperties.CALLBACK]);
}

/**
 * Executes command function
 * @param fn Function name or callback
 * @param args Function arguments
 * @param scope Scope
 * @param native Is function native
 */
export function execFn(fn: string | FunctionSignature, args: unknown[], scope: Scope = {}, native = false): unknown {
  args = prepareParam(arguments, 1, ArgumentCheck.ARRAY, []);
  scope = prepareParam(arguments, 2, ArgumentCheck.OBJECT, {});

  // If it's native, then function must be callable
  if (native) {
    fn = prepareParam<typeof arguments, 0, FunctionSignature>(arguments, 0, ArgumentCheck.FUNCTION);
    return fn(...args);
  }

  fn = prepareParam<typeof arguments, 0, string>(arguments, 0, ArgumentCheck.STRING);

  // Get command meta
  const command = getProperty(COMMANDS, fn);
  const callback = command[CommandProperties.CALLBACK];
  const commandArgs = command[CommandProperties.ARGS];
  const commandNamedArgs = command[CommandProperties.NAMED_ARGS];

  const lastArgs: unknown[] = [];
  let key: string = null;
  const callbackArgs: unknown[] = [];
  let optional = false;
  let variadic = false;

  for (let i = 0; i < commandArgs.length; i++) {
    // If current argument name is Scope, then use scope value
    if (commandArgs[i][CommandArgProperties.NAME] === CommandArgProperties.SCOPE) {
      callbackArgs[i] = scope;
      continue;
    }
    // Parse mode arguments only if it's last
    if (commandArgs[i][CommandArgProperties.NAME] === CommandArgProperties.MODE && i < commandArgs.length) {
      continue;
    }
    // Variadic arguments must be last
    if (commandArgs[i][CommandArgProperties.VARIADIC] && i !== commandArgs.length-1) {
      error(new WrongArgumentPositionError({
        argument: `Variadic argument "${commandArgs[i][CommandArgProperties.NAME]}"`,
        place: 'last'
      }));
    }

    // While args exist
    while (args.length) {
      // Get first argument
      const arg = args.shift();

      // If argument starts with "--"
      if (isString(arg) && arg.startsWith('--')) {
        // Stop if variadic argument placed before optional
        if (variadic) {
          error(new WrongArgumentPositionError({
            argument: `Optional argument "${arg}"`,
            condition: 'before',
            place: 'variadic argument'
          }));
        }
        // Wait only optional arguments
        optional = true;
        // If previous argument has no value, it's boolean argument
        if (key != null && !commandNamedArgs[key][CommandArgProperties.VARIADIC]) {
          callbackArgs[commandNamedArgs[key][CommandArgProperties.INDEX]] = true;
        }
        // Save key name
        key = convertToCamelCase(arg.substring(2), '-');
        checkProperty(commandNamedArgs, key);
      } else if (isString(arg) && arg.startsWith('-')) { // If argument starts with "-", it's mode
        // Stop if variadic argument placed before mode
        if (variadic) {
          error(new WrongArgumentPositionError({
            argument: `Mode "${arg}"`,
            condition: 'before',
            place: 'variadic argument'
          }));
        }
        // Split argument by chars
        const modes = arg.substring(1).split('');
        const modeArg = getProperty(commandNamedArgs, CommandArgProperties.MODE);
        let mode: number = callbackArgs[modeArg[CommandArgProperties.INDEX]] as number ?? 0;
        for (const flag of modes) {
          const flagValue = getProperty(command[CommandProperties.FLAGS], flag);
          // Add mode
          mode |= (flagValue ?? 0);
        }
        callbackArgs[commandNamedArgs[CommandArgProperties.MODE].ind] = mode;
      } else {
        // If key is not null, and it's not variadic, then it's value
        if (key != null && !commandNamedArgs[key][CommandArgProperties.VARIADIC]) {
          callbackArgs[commandNamedArgs[key][CommandArgProperties.INDEX]] = arg ?? commandNamedArgs[key][CommandArgProperties.DEFAULT];
          key = null;
          break;
        } else if (key != null) { // If it's a variadic, put last args in array
          lastArgs.push(arg);
        } else if (!optional) { // If there were no optional parameters, then
          // it's a variadic argument
          if (commandArgs[i][CommandArgProperties.VARIADIC]) {
            lastArgs.push(arg);
            variadic = true;
          } else { // or common argument
            callbackArgs[i] = arg ?? commandArgs[i][CommandArgProperties.DEFAULT];
            break;
          }
        } else {
          error(new WrongArgumentPositionError({
            argument: `Required argument`,
            condition: 'before',
            place: 'optional argument, or in the variadic argument (last one)'
          }));
        }
      }
    }

    // If last argument is a key without value, then set as true
    if (key != null && !commandNamedArgs[key][CommandArgProperties.VARIADIC]) {
      callbackArgs[commandNamedArgs[key][CommandArgProperties.INDEX]] = true;
    }

    // If passed arguments are empty, then set other with default value
    if (!commandArgs[i][CommandArgProperties.VARIADIC]) {
      // if (commandArgs[i][CommandArgProperties.CONTEXT] === CONTEXT_ARG) {
      //   callbackArgs[i] = callbackArgs[i] ?? scope[CONTEXT_ARG] ?? commandArgs[i][DEFAULT_ARG];
      // } else {
      callbackArgs[i] ??= commandArgs[i][CommandArgProperties.DEFAULT];
      // }
    }

    // If it's required argument, then it must be not null
    if (commandArgs[i][CommandArgProperties.REQUIRED] && ((callbackArgs[i] == null && !commandArgs[i][CommandArgProperties.VARIADIC]) || (commandArgs[i][CommandArgProperties.VARIADIC] && lastArgs.length == 0))) {
      error(new PropertyRequiredError({
        object: commandNamedArgs,
        property: commandArgs[i][CommandArgProperties.NAME]
      }));
    }
  }

  // If mode argument exists in meta, then set it with default value
  if (commandNamedArgs[CommandArgProperties.MODE] != null) {
    callbackArgs[commandNamedArgs[CommandArgProperties.MODE].ind] ??= commandNamedArgs[CommandArgProperties.MODE][CommandArgProperties.DEFAULT] ?? 0;
  }

  // Arguments are forbidden for command without arguments
  if (commandArgs.length == 0 && args.length > 0) {
    error(new ArgumentsLengthInvalidError({
      args: args,
      length: 0,
      condition: 'equal'
    }));
  }

  return callback(...callbackArgs, ...lastArgs);
}
