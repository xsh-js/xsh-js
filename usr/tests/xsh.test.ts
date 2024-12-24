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

import {describe, expect, test} from '@jest/globals';
import * as xsh from "@xsh-js/core";
import extJs from "@xsh-js/ext-js";
import extJson from "@xsh-js/ext-json";

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
          variadic: true,
          required: true
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
})

function getSyncVariables(): Record<string, unknown> {
  return {
    var1: {
      foo: {
        bar: {
          baz: [1, 2]
        }
      },
      bar: null
    },
    var2: {
      foo: {
        bar: {
          baz: [1, 2]
        }
      }
    },
    var3: ['1+1', '2*2'],
    var4: '1+1',
    var5: [1, Promise.resolve([() => 2, 3]), Promise.resolve(null)],
  }
}

function getCommandProvider(): [test: string, result: unknown, async?: boolean][] {
  return [
    ['[]', []],
    ['{}', {}],
    ['true == 1', true],
    ['false == 0', true],
    ['false !== 0', true],
    ['null == undefined', true],
    ['null === undefined', false],
    ['null == ""', false],
    ['text', 'text'],
    ['text; "text2 text3"', 'text2 text3'],
    ['text+" "+text3', 'text text3'],
    ['"some \\"text\\""', 'some "text"'],
    ['text -p', ['text', '-p']],
    ['p -1', ['p', -1]],
    ['1+2', 3],
    ['1-2', -1],
    ['1*2', 2],
    ['1.0*2', 2],
    ['1/2', 0.5],
    ['1%2', 1],
    ['2* -3', -6],
    ['2 *-3.5', -7],
    ['2 * -3.0', -6],
    ['-1 *2', -2],
    ['2.5*2', 5],
    ['2.5*2.0', 5],
    ['-2.5 * 2', -5],
    ['-2.0 * 2', -4],
    ['2==1', false],
    ['2!=1', true],
    ['2>1', true],
    ['2<1', false],
    ['2>=1', true],
    ['2<=1', false],
    ['[1,2]', [1, 2]],
    ['[1,2] | $context.1', 2],
    ['[1,2,3] | $context.(1+1)', 3],
    ['[1,2,3] | $context.3.2.1', undefined],
    ['null | $context.3.2.1', undefined],
    ['((1+2)*3-4)/5', 1],
    ['2+2-1*3+10/5', 3],
    ['{foo: 1*2, bar: 3*4} | $context.foo*3', 6],
    ['{foo: {bar: {baz: 5}}} | $context.foo.bar.baz && (1 && 1) && (0 || 0) || 1 || 2', 1],
    ['null ?? 2', 2],
    ['1 ?? 2', 1],
    ['null ?? undefined', undefined],
    ['$var1 | $context.foo.bar.baz.1', 2],
    ['$var1 | $context.foo.bar.baz.1 ?? 3', 2],
    ['$var2 | $context.foo.bar.baz.1', 2],
    ['$var2 | $context.foo.bar.baz.3', undefined],
    ['$var2 | $context.foo.bar.baz.3 ?? 3', 3],
    ['$var2 | $context.foo2.bar', undefined],
    ['$var2 | $context.foo.bar2.baz', undefined],
    ['4 >> [var1, foo, bar, baz, 4]; $var1.foo.bar.baz.4', 4],
    ['$$var3', [2, 4]],
    ['$$var4', 2],
    ['[1,2]+[3,4]', [1, 2, 3, 4]],
    ['[1,2] | $context.concat [3,4]', [1, 2, 3, 4]],
    ['{foo: 1}+{bar: 2}', {'foo': 1, 'bar': 2}],
    ['{foo: 1, 2, 3}', {'foo': 1, '0': 2, '1': 3}],
    ['[1,2,3] [1,2,3]', [[1, 2, 3], [1, 2, 3]]],
    ['1.0123 | $context.toFixed 2', '1.01'],
    ['"test" | $context >> testVar; $testVar', 'test'],
    ['random | $$context > 0', true],
    ['$global.Math', Math],
    ['$global.Math.min 3 1 2', 1],
    ['$global.Math.min | $context 3 1 2', 1],
    ['$$global.Math.random > 0', true],
    ['($global.Math.random | $$context) > 0', true],
    ['min 3 1 2', 1],
    ['concat " " 1 2 3', "1 2 3"],
    ['concat null 1 2 3', "1 2 3"],
    ['concat --args 1 2 3', "1 2 3"],
    ['concat -ab -c -D --args 1 2 3 --delim "|"', "1|2|3"],
    ['async (async 2)*2', 4, true],
    ['async --as-array --context (async 2)*2', [4], true],
    ['(async 2)*2 | async $context --as-array', [4], true],
    ['$var5.1.0 | $$context', 2, true],
    ['$var5.1.1', 3, true],
    ['$var5.1.2', undefined, true],
    ['$var5.2.2', undefined, true],
  ];
}

function getErrorProvider(): [test: string, result: unknown, async?: boolean][] {
  return [
    ['1*a', xsh.PropertyTypeMismatchError],
    ['random 1', xsh.ArgumentsLengthInvalidError],
    ['min', xsh.PropertyRequiredError],
    ['async -P', xsh.PropertyNotFoundError],
    ['async --is-array', xsh.PropertyNotFoundError],
    ['async --as-array true 1', xsh.WrongArgumentPositionError],
    ['concat -P', xsh.PropertyNotFoundError],
    ['concat 1 2 3 --args 1 2 3', xsh.WrongArgumentPositionError],
    ['concat 1 2 3 -a', xsh.WrongArgumentPositionError],
    ['concat 1 2 3 --delim ""', xsh.WrongArgumentPositionError]
  ]
}

function getContentProvider(): [test: string, result: unknown, async?: boolean][] {
  return [
    [
      `//#xsh 2+2 >> testVar;
__XSH_VAR_TEST_VAR__`,
      '4'
    ],
    [
      `//#xsh 2 >> testVar1;
//#xsh '$testVar1+2' >> testVar2;
//#xsh $$testVar2+1 >> testVar1;
//#xsh '$testVar1+2' >> testVar2;
__XSH_RUN_TEST_VAR_2__`,
      '7'
    ],
    [
      `//#xsh async (async 2)*2 >> testVar;
__XSH_VAR_TEST_VAR__`,
      '4',
      true
    ],
    [
      `//#xsh "async (async 2)*2" >> testVar;
__XSH_RUN_TEST_VAR__`,
      '4',
      true
    ],
    [
      `//#xsh '2*2' >> testVar3;
test \`#xsh $$testVar3\``,
      'test 4'
    ],
    [
      `//#xsh 2 >> testVar4;
//#xsht $$template
2+$testVar4
///xsht`,
      '4'
    ],
    [
      `//#xsh 2 >> testVar4;
//#xsht null
///xsht`,
      ''
    ],
    [
      `//#xsh 2 >> testVar4;
`,
      ''
    ]
  ];
}

function getJsonContentProvider(): [test: string, result: unknown, async?: boolean][] {
  return [
    [
      `{"test": "2+\`#xsh 2+2\`+\`#xsh {test: 2} | $context.test\`"}`,
      '{"test": "2+4+2"}'
    ],
    [
      `{"test": "#xsh \\"test string\\""}`,
      '{"test": "test string"}'
    ],
    [
      `{"test": "#xsh true"}`,
      '{"test": true}'
    ],
    [
      `{"test": "#xsh null"}`,
      '{"test": null}'
    ],
    [
      `{"test": "#xsh 2+2"}`,
      '{"test": 4}'
    ],
    [
      `{"test": "#xsh [2,2]"}`,
      '{"test": [2,2]}'
    ],
    [
      `{"test": "#xsh {test2: 2}"}`,
      '{"test": {"test2":2}}'
    ],
    [
      `{"test": "#xsh async null ?? (null ?? null) ?? (0 || 1 && 0) || 1 && 2"}`,
      '{"test": 2}',
      true
    ]
  ];
}

describe('Parser sync tests', () => {
  const vars = getSyncVariables();
  for (const key in vars) {
    if (!Object.prototype.hasOwnProperty.call(vars, key)) {
      continue;
    }
    xsh.setVar(key, vars[key]);
  }
  const commandProvider = getCommandProvider();
  for (const item of commandProvider) {
    test(item[0] as string, async () => {
      if (item[2]) {
        expect(await xsh.parse(item[0], null, item[2])).toStrictEqual(item[1]);
      } else {
        expect(xsh.parse(item[0], null, item[2])).toStrictEqual(item[1]);
      }
    });
  }
  const contentProvider = getContentProvider();
  for (const item of contentProvider) {
    test(item[0], async () => {
      if (item[2]) {
        expect(await xsh.parseTemplate(item[0], 'js', null, item[2])).toStrictEqual(item[1]);
      } else {
        expect(xsh.parseTemplate(item[0], 'js', null, item[2])).toStrictEqual(item[1]);
      }
    });
  }
  const jsonContentProvider = getJsonContentProvider();
  for (const item of jsonContentProvider) {
    test(item[0] as string, async () => {
      if (item[2]) {
        expect(await xsh.parseTemplate(item[0], 'json', null, item[2])).toStrictEqual(item[1]);
      } else {
        expect(xsh.parseTemplate(item[0], 'json', null, item[2])).toStrictEqual(item[1]);
      }
    });
  }
  const errorProvider = getErrorProvider();
  for (const item of errorProvider) {
    test(item[0] as string, async () => {
      if (item[2]) {
        expect(async () => await xsh.parse(item[0], null, item[2])).toThrowError(item[1]);
      } else {
        expect(() => xsh.parse(item[0], null, item[2])).toThrowError(item[1]);
      }
    });
  }
});
