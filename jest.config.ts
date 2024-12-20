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

import {defaults} from 'jest-config';
import {compilerOptions} from './tsconfig.test.json';
import {JestConfigWithTsJest, pathsToModuleNameMapper} from "ts-jest";

const config: JestConfigWithTsJest = {
  rootDir: "./",
  verbose: false,
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: [
    "<rootDir>usr/tests/**/*.{spec,test}.{j,t}s?(x)"
  ],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>'
  }),
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'mts'],
  transform: {
    "^.+\\.[tj]s$": ["ts-jest", {
      tsconfig: {
        allowJs: true
      }
    }],
  },
};

export default config;
