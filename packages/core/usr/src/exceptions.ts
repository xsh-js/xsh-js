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

/**
 * Base exception class.
 * All exceptions inherit this class.
 * Stores payload.
 */
export abstract class BaseException<T = unknown> extends Error {
  constructor(public payload?: T, options?: ErrorOptions) {
    super("", options);
    this.message = this.getMessage();
  }

  /**
   * Get message as text
   * @protected
   */
  protected abstract getMessage(): string;
}

/**
 * Continuation of work
 * It is used when you want to skip the execution
 * of a part of the code and move on to the next one.
 */
export class Continue extends BaseException {
  protected getMessage(): string {
    return "Continue";
  }
}

/**
 * Property not found
 */
type PropertyNotFound = {
  /**
   * Object
   */
  object: unknown,
  /**
   * Property
   */
  property: string
}

/**
 * Property not found error.
 * Used when the passed object does not have the specified property.
 */
export class PropertyNotFoundError extends BaseException<PropertyNotFound> {
  protected override getMessage(): string {
    return `Property "${this.payload.property}" not found in object:\n${JSON.stringify(this.payload.object, null, 2)}`;
  }
}

/**
 * Property type mismatched
 */
type PropertyTypeMismatch = {
  /**
   * Object
   */
  object: unknown,
  /**
   * Property
   */
  property: string,
  /**
   * Type
   */
  type: string
}

/**
 * Property type mismatched.
 * It is used when the property type of object does not match the specified property type.
 */
export class PropertyTypeMismatchError extends BaseException<PropertyTypeMismatch> {
  protected override getMessage(): string {
    return `Property "${this.payload.property}" must be instance of "${this.payload.type}". Given: "${typeof this.payload.object[this.payload.property]}". Object:\n${JSON.stringify(this.payload.object, null, 2)}`;
  }
}

/**
 * Parameter type is invalid
 */
type ParameterTypeInvalid = {
  /**
   * Arguments
   */
  arguments: ArrayLike<any>,
  /**
   * Argument index
   */
  param: number,
  /**
   * Type
   */
  type: string,
}

/**
 * Parameter type is invalid
 * It is used when the type of the function parameter does not match the specified type.
 */
export class ParameterTypeInvalidError extends BaseException<ParameterTypeInvalid> {
  protected override getMessage(): string {
    return `Parameter #${this.payload.param} must be instance of "${this.payload.type}". Given: ${typeof this.payload.arguments[this.payload.param]}.\nParameters: ${JSON.stringify(this.payload.arguments, null, 2)}`;
  }
}

/**
 * Variable type is invalid
 */
type VariableTypeInvalid = {
  /**
   * Value
   */
  value: unknown,
  /**
   * Type
   */
  type: string,
}

/**
 * Variable type is invalid
 * It is used when the type of the variable does not match the specified type.
 */
export class VariableTypeInvalidError extends BaseException<VariableTypeInvalid> {
  protected override getMessage(): string {
    return `Value must be instance of "${this.payload.type}". Value:\n${JSON.stringify(this.payload.value, null, 2)}`;
  }
}

/**
 * Property is required
 */
type PropertyRequired = {
  /**
   * Object
   */
  object: unknown,
  /**
   * Property
   */
  property: string
}

/**
 * Property is required.
 * It is used when a property must be explicitly declared in an object.
 */
export class PropertyRequiredError extends BaseException<PropertyRequired> {
  protected override getMessage(): string {
    return `Property "${this.payload.property}" is required! Object:\n${JSON.stringify(this.payload.object, null, 2)}`;
  }
}

/**
 * Assert is failed
 */
type AssertFailed = {
  /**
   * Value
   */
  value: unknown,
  /**
   * Type
   */
  type: string
}

/**
 * Assert is failed.
 * It is used when the type of the variable does not match the specified type.
 */
export class AssertFailedError extends BaseException<AssertFailed> {
  protected override getMessage(): string {
    return `Value must be instance of "${this.payload.type}". Value:\n${JSON.stringify(this.payload.value, null, 2)}`;
  }
}

/**
 * Incorrect mathematical operation
 */
type MathResultInvalid = {
  /**
   * Operation
   */
  mathType: string,
  /**
   * Operands
   */
  operands: unknown[],
}

/**
 * Incorrect mathematical operation.
 * It is used when operand types do not match the expected types
 * mathematical operation
 */
export class MathResultInvalidError extends BaseException<MathResultInvalid> {
  protected override getMessage(): string {
    return `Math operation "${this.payload.mathType}" not allowed for operands: \n${JSON.stringify(this.payload.operands, null, 2)}`;
  }
}

/**
 * Arguments length is invalid
 */
type ArgumentsLengthInvalid = {
  /**
   * Arguments
   */
  args: unknown[],
  /**
   * Length
   */
  length: number,
  /**
   * Condition
   */
  condition: string,
}

/**
 * Arguments length is invalid
 * It is used when the number of arguments is not equal to the specified number of arguments
 */
export class ArgumentsLengthInvalidError extends BaseException<ArgumentsLengthInvalid> {
  protected override getMessage(): string {
    return `Arguments count must be ${this.payload.condition} ${this.payload.length}. Given: ${this.payload.args.length}. Arguments: \n${JSON.stringify(this.payload.args, null, 2)}`;
  }
}

/**
 * Wrong argument position
 */
type WrongArgumentPosition = {
  /**
   * Argument
   */
  argument: unknown,
  /**
   * Condition
   */
  condition?: string,
  /**
   * Place
   */
  place: string,
}

/**
 * Wrong argument position error
 * It is used when the argument is in the wrong position
 */
export class WrongArgumentPositionError extends BaseException<WrongArgumentPosition> {
  protected override getMessage(): string {
    return `${this.payload.argument} must be paced${this.payload.condition != null ? ` ${this.payload.condition}` : this.payload.condition} ${this.payload.place}`;
  }
}
