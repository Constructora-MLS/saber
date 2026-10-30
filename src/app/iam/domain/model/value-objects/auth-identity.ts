// Package valueobjects holds the value objects of the IAM bounded context.
// package valueobjects

/**
 * AuthIdentity is the public identity of the user of the platform.
 *
 * It is the minimum that the platform publishes about a user: the
 * identifier, the email and the name.
 */
export interface AuthIdentity {
  /** The identifier of the user. */
  readonly uuid: string;
  /** The address of the user. */
  readonly email: string;
  /** The first name of the user. */
  readonly firstName: string;
  /** The last name of the user. */
  readonly lastName: string;
}

/**
 * restoreAuthIdentity trusts the identity that the platform already
 * validated.
 */
export function restoreAuthIdentity(
  uuid: string,
  email: string,
  firstName: string,
  lastName: string,
): AuthIdentity {
  return { uuid, email, firstName, lastName };
}
