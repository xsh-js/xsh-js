# Next Shell JS

Import library and plugins:
```ts
import * as xsh from "xsh-js";
import extJs from '@xsh-js/ext-js';
import extJson from '@xsh-js/ext-json';
```

Add core plugin:
```ts
xsh.setConfig(xsh.plugin());
```

Set config with plugins and user commands:
```ts

xsh.setConfig({
    plugins: [extJs, extJson],
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
```

Use variables:
```js
const scope = {
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
```

Execute command:
```js
xsh.parse("...", scope)
```

Command examples:

| Expression                                                                                                                                                                          | Result                       |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------|
| `true == 1`                                                                                                                                                                         | `true`                       |,
| `false == 0`                                                                                                                                                                        | `true`                       |,
| `false !== 0`                                                                                                                                                                       | `true`                       |,
| `null == undefined`                                                                                                                                                                 | `true`                       |,
| `null === undefined`                                                                                                                                                                | `false`                      |,
| `null == ""`                                                                                                                                                                        | `false`                      |,
| `text`                                                                                                                                                                              | `text`                       |,
| `text; "text2 text3"`                                                                                                                                                               | `"text2 text3"`              |,
| `"some \"text\""`                                                                                                                                                                   | `'some "text"'`              |,
| `text -p`                                                                                                                                                                           | `['text', '-p']`             |,
| `p -1`                                                                                                                                                                              | `['p', -1]`                  |,
| `1+2`                                                                                                                                                                               | `3`                          |,
| `1-2`                                                                                                                                                                               | `-1`                         |,
| `1*2`                                                                                                                                                                               | `2`                          |,
| `1.0*2`                                                                                                                                                                             | `2`                          |,
| `1/2`                                                                                                                                                                               | `0.5`                        |,
| `1%2`                                                                                                                                                                               | `1`                          |,
| `2* -3`                                                                                                                                                                             | `-6`                         |,
| `2 *-3.5`                                                                                                                                                                           | `-7`                         |,
| `2 * -3.0`                                                                                                                                                                          | `-6`                         |,
| `-1 *2`                                                                                                                                                                             | `-2`                         |,
| `2.5*2`                                                                                                                                                                             | `5`                          |,
| `2.5*2.0`                                                                                                                                                                           | `5`                          |,
| `-2.5 * 2`                                                                                                                                                                          | `-5`                         |,
| `-2.0 * 2`                                                                                                                                                                          | `-4`                         |,
| `2==1`                                                                                                                                                                              | `false`                      |,
| `2!=1`                                                                                                                                                                              | `true`                       |,
| `2>1`                                                                                                                                                                               | `true`                       |,
| `2<1`                                                                                                                                                                               | `false`                      |,
| `2>=1`                                                                                                                                                                              | `true`                       |,
| `2<=1`                                                                                                                                                                              | `false`                      |,
| `[1,2]`                                                                                                                                                                             | `[1, 2]`                     |,
| `[1,2] \| $context.1`                                                                                                                                                               | `2`                          |,
| `[1,2,3] \| $context.(1+1)`                                                                                                                                                         | `3`                          |,
| `[1,2,3] \| $context.3.2.1`                                                                                                                                                         | `undefined`                  |,
| `null \| $context.3.2.1`                                                                                                                                                            | `undefined`                  |,
| `((1+2)*3-4)/5`                                                                                                                                                                     | `1`                          |,
| `2+2-1*3+10/5`                                                                                                                                                                      | `3`                          |,
| `{foo: 1*2, bar: 3*4} \| $context.foo*3`                                                                                                                                            | `6`                          |,
| `{foo: {bar: {baz: 5}}} \| $context.foo.bar.baz && (1 && 1) && (0 \|\| 0) \|\| 1 \|\| 2`                                                                                            | `1`                          |,
| `null ?? 2`                                                                                                                                                                         | `2`                          |,
| `1 ?? 2`                                                                                                                                                                            | `1`                          |,
| `null ?? undefined`                                                                                                                                                                 | `undefined`                  |,
| `$var1 \| $context.foo.bar.baz.1`                                                                                                                                                   | `2`                          |,
| `$var1 \| $context.foo.bar.baz.1 ?? 3`                                                                                                                                              | `2`                          |,
| `$var2 \| $context.foo.bar.baz.1`                                                                                                                                                   | `2`                          |,
| `$var2 \| $context.foo.bar.baz.3`                                                                                                                                                   | `undefined`                  |,
| `$var2 \| $context.foo.bar.baz.3 ?? 3`                                                                                                                                              | `3`                          |,
| `$var2 \| $context.foo2.bar`                                                                                                                                                        | `undefined`                  |,
| `$var2 \| $context.foo.bar2.baz`                                                                                                                                                    | `undefined`                  |,
| `4 >> [var1, foo, bar, baz, 4]; $var1.foo.bar.baz.4`                                                                                                                                | `4`                          |,
| `$$var3`                                                                                                                                                                            | `[2, 4]`                     |,
| `$$var4`                                                                                                                                                                            | `2`                          |,
| `[1,2]+[3,4]`                                                                                                                                                                       | `[1, 2, 3, 4]`               |,
| `[1,2] \| $context.concat [3,4]`                                                                                                                                                    | `[1, 2, 3, 4]`               |,
| `{foo: 1}+{bar: 2}`                                                                                                                                                                 | `{'foo': 1, 'bar': 2}`       |,
| `{foo: 1, 2, 3}`                                                                                                                                                                    | `{'foo': 1, '0': 2, '1': 3}` |,
| `[1,2,3] [1,2,3]`                                                                                                                                                                   | `[[1, 2, 3], [1, 2, 3]]`     |,
| `1.0123 \| $context.toFixed 2`                                                                                                                                                      | `1.01`                       |,
| `"test" \| $context >> testVar; $testVar`                                                                                                                                           | `"test"`                     |,
| `random \| $$context > 0`                                                                                                                                                           | `true`                       |,
| `$global.Math`                                                                                                                                                                      | `Math`                       |,
| `$global.Math.min 3 1 2`                                                                                                                                                            | `1`                          |,
| `$global.Math.min \| $context 3 1 2`                                                                                                                                                | `1`                          |,
| `$$global.Math.random > 0`                                                                                                                                                          | `true`                       |,
| `($global.Math.random \| $$context) > 0`                                                                                                                                            | `true`                       |,
| `min 3 1 2`                                                                                                                                                                         | `1`                          |,
| `concat " " 1 2 3`                                                                                                                                                                  | `"1 2 3"`                    |,
| `concat null 1 2 3`                                                                                                                                                                 | `"1 2 3"`                    |,
| `concat --args 1 2 3`                                                                                                                                                               | `"1 2 3"`                    |,
| `concat -ab -c -D --args 1 2 3 --delim "\|"`                                                                                                                                        | `"1\|2\|3"`                  |,

Execute asynchronous command:

```js
await xsh.parse("...", scope, null, true)
```

Asynchronous command examples:

| Expression                                                                                                                                                                          | Result                       |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------|
| `async (async 2)*2`                                                                                                                                                                 | `4`                          |,
| `async --as-array --context (async 2)*2`                                                                                                                                            | `[4]`                        |,
| `(async 2)*2 \| async $context --as-array`                                                                                                                                          | `[4]`                        |,
| `$var5.1.0 \| $$context`                                                                                                                                                            | `2`                          |,
| `$var5.1.1`                                                                                                                                                                         | `3`                          |,
| `$var5.1.2`                                                                                                                                                                         | `undefined`                  |,
| `$var5.2.2`                                                                                                                                                                         | `undefined`                  |

## Extensions

### ext-js

Specify file extension:

```js
xsh.parseTemplate("...", 'js', scope)
```

Template examples:

| Expression                                                                                                                                                                          | Result                       |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------|
| `//#xsh 2+2 >> testVar;` <br/> `__XSH_VAR_TEST_VAR__`                                                                                                                               | `4`                          |
| `//#xsh 2 >> testVar1;` <br/> `//#xsh '$testVar1+2' >> testVar2;` <br/> `//#xsh $$testVar2+1 >> testVar1;` <br/> `//#xsh '$testVar1+2' >> testVar2;` <br/> `__XSH_RUN_TEST_VAR_2__` | `7`                          |
| `//#xsh '2*2' >> testVar3;` <br/> ``test `#xsh $$testVar3` ``                                                                                                                       | `test 4` |
| `//#xsh 2 >> testVar4;` <br/> `//#xsht $$template` <br/> `2+$testVar4` <br/> `///xsht` | `4` |

Asynchronous request:

```js
await xsh.parseTemplate("...", 'js', scope, true)
```

Asynchronous template examples:

| Expression                                                                                                                                                                          | Result                       |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------|
| `//#xsh async (async 2)*2 >> testVar;` <br/> `__XSH_VAR_TEST_VAR__`                                                                                                                 |  `4`                         |
| `//#xsh "async (async 2)*2" >> testVar;` <br/> `__XSH_RUN_TEST_VAR__`                                                                                                                 |  `4`                         |

### ext-json

Specify file extension:

```js
xsh.parseTemplate("...", 'json', scope)
```

Template examples:

| Expression                                                     | Result                    |
|----------------------------------------------------------------|---------------------------|
| ``{"test": "2+`#xsh 2+2`+`#xsh {test: 2} \| $context.test`"}`` | `{"test": "2+4+2"}`       |
| `{"test": "#xsh \"test string\""}` | `{"test": "test string"}` |      
| `{"test": "#xsh true"}` | `{"test": true}`          |    
| `{"test": "#xsh null"}` | `{"test": null}`          |
| `{"test": "#xsh 2+2"}` | `{"test": 4}`             |   
| `{"test": "#xsh [2,2]"}` | `{"test": [2,2]}`         |
| `{"test": "#xsh {test2: 2}"}` | `{"test": {"test2": 2}}`  |

Asynchronous request:

```js
await xsh.parseTemplate("...", 'json', scope, true)
```

Asynchronous template examples:

| Expression                                                     | Result                    |
|----------------------------------------------------------------|---------------------------|
| `{"test": "#xsh async null ?? (null ?? null) ?? (0 \|\| 1 && 0) \|\| 1 && 2"}` | `{"test": 2}` |
