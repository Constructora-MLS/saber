// Package errors holds the errors of the Assignments bounded context.
//
// The errors are expressed in the ubiquitous language of the context: they
// never mention HTTP statuses nor JSON payloads.
// package errors

/**
 * AssignmentValidationError reports the invalid value of a field.
 *
 * The field is part of the invariant that was broken, so the interfaces can
 * show the message next to the input that produced it.
 */
export class AssignmentValidationError extends Error {
  constructor(
    readonly field: string,
    readonly reason: string,
  ) {
    super(reason);
    this.name = 'AssignmentValidationError';
  }
}
