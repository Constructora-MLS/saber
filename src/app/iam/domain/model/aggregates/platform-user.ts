// Package aggregates holds the aggregate roots of the IAM bounded context.
// package aggregates

import { Email } from '../value-objects/email';
import { UserId } from '../value-objects/user-id';
import { UserStatus } from '../value-objects/user-status';

/**
 * PlatformUser is an account of the platform.
 *
 * The aggregate keeps the public information of the account: the address
 * that identifies it, its names and the state that decides whether it may
 * authenticate. The credential of the account never reaches the browser.
 */
export class PlatformUser {
  private constructor(
    readonly id: UserId,
    readonly email: Email,
    readonly firstName: string,
    readonly lastName: string,
    readonly status: UserStatus,
  ) {}

  /**
   * restore rebuilds the account from its published representation.
   */
  static restore(
    id: UserId,
    email: Email,
    firstName: string,
    lastName: string,
    status: UserStatus,
  ): PlatformUser {
    return new PlatformUser(id, email, firstName, lastName, status);
  }

  /**
   * fullName returns the name of the account as it is shown in the listings.
   *
   * A pending account has no name yet: the name is empty until the invited
   * member accepts the invitation.
   */
  get fullName(): string {
    return [this.firstName, this.lastName]
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .join(' ');
  }
}
