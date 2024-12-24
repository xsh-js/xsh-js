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

import * as xsh from '@xsh-js/core';
import extJs from '@xsh-js/ext-js';
import extJson from '@xsh-js/ext-json';

xsh.setConfig({
  plugins: [xsh.plugin(), extJs, extJson],
  commands: {
    concat: {
      callback: (scope: xsh.Scope, mode: number, delim: string = " ", ...args: unknown[]) => {
        return args.join(delim);
      },
      flags: {
        'a': 1,
        'b': 2,
        'c': 4,
        'D': 8
      },
      args: [
        {
          name: "scope",
          required: true,
        },
        {
          name: "mode",
          required: true,
          default: 2
        },
        {
          name: "delim",
          default: " "
        },
        {
          name: "args",
          variadic: true,
          required: false
        }
      ]
    },
    min: {
      callback: Math.min,
      args: [
        {
          name: "values",
          variadic: false,
          required: true,
        }
      ]
    },
    random: {
      callback: Math.random,
      args: []
    },
    async: {
      callback: async (context?: unknown, asArray: boolean = false) => {
        return asArray ? [context] : context;
      },
      args: [
        {
          name: "context",
        },
        {
          name: "asArray",
          default: false
        }
      ]
    }
  }
});

console.log(await xsh.parse(`async 1 --as-array true`, null, true));

export {};
