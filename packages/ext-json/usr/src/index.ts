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
  getFunction,
  getRunnableConstName,
  getVariableHash,
  GlobalRules, isArray, isObject,
  parse, replacer, replacerAsync, RuleContext, RuleList,
  stripSlashes, TemplateContext, TemplateMeta,
  TemplateProps,
  validateConfig,
  ValidConfig
} from "@xsh-js/core";

/**
 * Parse JSON result
 */
const PREPARE_JSON_RESULT: RuleList = [
  {
    regexp: /"/g,
    callback: '\\"'
  },
  {
    regexp: /^(.*)$/g,
    callback: '"$1"'
  }
];

/**
 * Template commands
 */
const ContentCommands = {
  /**
   * JSON command
   */
  JSON_XSH_COMMAND: /"#xsh\s+(?<command>.*?)(?<!\\)"/gi,
}

/**
 * Get plugin config
 */
export function extJson(): ValidConfig<Record<string, any>, Partial<Record<keyof GlobalRules, any>>> {
  return validateConfig({
    rules: {
      template: {
        // Parse JSON string
        jsonCommand: {
          regexp: ContentCommands.JSON_XSH_COMMAND,
          callback:
            (context, match: string, command: string): string => {
              // Remove backslashes
              command = stripSlashes(command);
              // Get command hash
              const varName = getVariableHash(command, true);
              // Wrap to function
              context[TemplateProps.context.SCOPE][varName] = context[TemplateProps.context.ASYNC] ? async () => {
                const checkValue = getFunction(context[TemplateProps.context.RULE][TemplateProps.META], 'checkValue');
                const res = await parse(command, context[TemplateProps.context.SCOPE], context[TemplateProps.context.ASYNC]);
                return checkValue(res, context) as string;
              } : () => {
                const checkValue = getFunction(context[TemplateProps.context.RULE][TemplateProps.META], 'checkValue');
                const res = parse(command, context[TemplateProps.context.SCOPE], context[TemplateProps.context.ASYNC]);
                return checkValue(res, context) as string;
              };
              // Return system command name
              return getRunnableConstName(varName, true);
            },
          meta:
            {
              checkValue: (value: unknown, context: RuleContext<TemplateContext, TemplateMeta>): unknown => {
                // Parse JSON result
                switch (typeof value) {
                  case 'string':
                    return context.async
                      ? replacerAsync(PREPARE_JSON_RESULT, value, context)
                      : replacer(PREPARE_JSON_RESULT, value, context);
                  case 'object':
                    if (isArray(value) || isObject(value)) {
                      return JSON.stringify(value);
                    }
                }
                return value;
              },
              types:
                [
                  'json'
                ]
            }
        }
      }
    }
  });
}

export default extJson();
