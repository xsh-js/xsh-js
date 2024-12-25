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
  parse, RuleContext,
  ScopeVars,
  stripSlashes, TemplateContext, TemplateMeta,
  TemplateProps,
  validateConfig,
  ValidConfig
} from "@xsh-js/core";

/**
 * Template commands
 */
const ContentCommands = {
  /**
   * Line command
   */
  TPL_XSH_COMMAND: /(?<start>^\s*)\/\/#xsh\s+(?<command>.*?)(?<end>\n|$)/gimu,
  /**
   * Template
   */
  TPL_XSHT_COMMAND: /(?<start>^\s*)\/\/#xsht\s+(?<command>.*?)\n(?<block>[\s\S]*?)(?<space>\n\s*|^\s*|$)\/\/\/xsht(?<end>\n|$)/gimu,
}

/**
 * Get plugin config
 */
export function extJs(): ValidConfig<Record<string, any>, Partial<Record<keyof GlobalRules, any>>> {
  return validateConfig({
    rules: {
      template: {
        // Parse #xsht command
        template: {
          regexp: ContentCommands.TPL_XSHT_COMMAND,
          callback:
            (context, match: string, start:string, command: string, block: string, space:string, end:string, offset: number): unknown => {
              // Remove backslashes
              command = stripSlashes(command);
              // Get command hash
              const varName = getVariableHash(command, true);

              context[TemplateProps.context.SCOPE][varName] = context[TemplateProps.context.ASYNC] ? async () => {
                const checkValue = getFunction(context[TemplateProps.context.RULE][TemplateProps.META], 'checkValue');

                const prevOffset = context[TemplateProps.context.SCOPE][ScopeVars.OFFSET];
                const prevTemplate = context[TemplateProps.context.SCOPE][ScopeVars.TEMPLATE];

                context[TemplateProps.context.SCOPE][ScopeVars.OFFSET] = offset;
                context[TemplateProps.context.SCOPE][ScopeVars.TEMPLATE] = block;

                const res = await parse(command, context[TemplateProps.context.SCOPE], context[TemplateProps.context.ASYNC]);

                context[TemplateProps.context.SCOPE][ScopeVars.OFFSET] = prevOffset;
                context[TemplateProps.context.SCOPE][ScopeVars.TEMPLATE] = prevTemplate;

                return checkValue(res, end, context) as string;
              } : () => {
                const checkValue = getFunction(context[TemplateProps.context.RULE][TemplateProps.META], 'checkValue');

                const prevOffset = context[TemplateProps.context.SCOPE][ScopeVars.OFFSET];
                const prevTemplate = context[TemplateProps.context.SCOPE][ScopeVars.TEMPLATE];

                context[TemplateProps.context.SCOPE][ScopeVars.OFFSET] = offset;
                context[TemplateProps.context.SCOPE][ScopeVars.TEMPLATE] = block;

                const res = parse(command, context[TemplateProps.context.SCOPE], context[TemplateProps.context.ASYNC]);

                context[TemplateProps.context.SCOPE][ScopeVars.OFFSET] = prevOffset;
                context[TemplateProps.context.SCOPE][ScopeVars.TEMPLATE] = prevTemplate;

                return checkValue(res, end, context) as string;
              };
              // Return system command name
              return getRunnableConstName(varName, true);
            },
          meta:
            {
              checkValue: (value: unknown, end:string, context: RuleContext<TemplateContext, TemplateMeta>): unknown => {
                switch (typeof value) {
                  case "bigint":
                  case "number":
                  case 'string':
                    return `${value}${end}`;
                  default:
                    return "";
                }
              },
              types: [
                'js'
              ]
            }
          ,
          order: -9999
        },
        // Parse #xsh command
        command: {
          regexp: ContentCommands.TPL_XSH_COMMAND,
          callback:
            (context, match: string, start:string, command: string, end: string): unknown => {
              // Remove backslashes
              command = stripSlashes(command);
              // Get command hash
              const varName = getVariableHash(command, true);
              // Wrap to function
              context[TemplateProps.context.SCOPE][varName] = context[TemplateProps.context.ASYNC] ? async () => {
                const checkValue = getFunction(context[TemplateProps.context.RULE][TemplateProps.META], 'checkValue');

                const res = await parse(command, context[TemplateProps.context.SCOPE], context[TemplateProps.context.ASYNC]);

                return checkValue(res, end, context) as string;
              } : () => {
                const checkValue = getFunction(context[TemplateProps.context.RULE][TemplateProps.META], 'checkValue');

                const res = parse(command, context[TemplateProps.context.SCOPE], context[TemplateProps.context.ASYNC]);

                return checkValue(res, end, context) as string;
              };
              // Return system command name
              return getRunnableConstName(varName, true);
            },
          meta:
            {
              checkValue: (value: unknown, end: string, context: RuleContext<TemplateContext, TemplateMeta>): unknown => {
                switch (typeof value) {
                  case "bigint":
                  case "number":
                  case 'string':
                    return `${value}${end}`;
                  default:
                    return "";
                }
              },
              types: [
                'js'
              ]
            }
        }
      }
    }
  });
}

export default extJs();
