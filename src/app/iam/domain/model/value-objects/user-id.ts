// Package valueobjects holds the value objects of the IAM bounded context.
// package valueobjects

import { AuthValidationError } from '../errors/auth-errors';

/**
 * UUID_PATTERN is the shape of the identifier of a record of the platform.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * UserId is the identifier of an account of the platform.
 */
export class UserId {
  private constructor(private readonly text: string) {}

  /**
   * create validates and builds the identifier of an account.
   *
   * The identifier is the identifier of a record of the platform, so it
   * must be a UUID: the platform rejects any other value.
   */
  static create(raw: string): UserId {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new AuthValidationError('id', 'El identificador del usuario es obligatorio.');
    }
    if (!UUID_PATTERN.test(trimmed)) {
      throw new AuthValidationError('id', 'El identificador del usuario no es válido.');
    }
    return new UserId(trimmed);
  }

  /**
   * restore rebuilds an identifier from its stored value.
   */
  static restore(value: string): UserId {
    return new UserId(value);
  }

  /**
   * value returns the identifier as it was stored.
   */
  get value(): string {
    return this.text;
  }
}
