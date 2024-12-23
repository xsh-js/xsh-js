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
  getRunnableConstName,
  getVariableHash,
  GlobalRules,
  parse,
  ScopeVars,
  stripSlashes,
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
  TPL_XSH_COMMAND: /\/\/#xsh\s+(?<command>.*?)\n+/gi,
  /**
   * Template
   */
  TPL_XSHT_COMMAND: /\/\/#xsht\s+(?<command>.*?)\n+(?<block>[\s\S]*?)\/\/\/xsht/giu,
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
            ({
               [TemplateProps.context.SCOPE]: scope,
               [TemplateProps.context.ASYNC]: async,
             }, match: string, command: string, block: string, offset: number): unknown => {
              // Remove backslashes
              command = stripSlashes(command);
              // Get command hash
              const varName = getVariableHash(command, true);
              // Wrap to function
              scope[varName] = () => {
                scope[ScopeVars.OFFSET] = offset;
                scope[ScopeVars.TEMPLATE] = block;
                return parse(command, scope, null, async);
              }
              // Return system command name
              return getRunnableConstName(varName, true);
            },
          meta:
            {
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
            ({
               [TemplateProps.context.SCOPE]: scope,
               [TemplateProps.context.ASYNC]: async,
             }, match: string, command: string): unknown => {
              // Remove backslashes
              command = stripSlashes(command);
              // Get command hash
              const varName = getVariableHash(command, true);
              // Wrap to function
              scope[varName] = () => parse(command, scope, null, async)
              // Return system command name
              return getRunnableConstName(varName, true);
            },
          meta:
            {
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
