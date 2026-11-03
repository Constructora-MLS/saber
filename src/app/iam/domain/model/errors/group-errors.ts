// Package errors holds the errors of the IAM bounded context.

/**
 * GroupValidationError reports an invalid value of a group field.
 */
export class GroupValidationError extends Error {
  constructor(
    readonly field: string,
    readonly reason: string,
  ) {
    super(reason);
    this.name = 'GroupValidationError';
  }
}
