// Package http holds the contracts of the HTTP API of the IAM bounded
// context.
//
// The types mirror the published OpenAPI contract of the platform, so the
// frontend consumes the same contract that the backend documents.
// package http

/**
 * The state of an account as it is published by the API.
 *
 * The disabled accounts are never published: the platform excludes them
 * from the listings.
 */
export type UserStatusResource = 'active' | 'pending';

/**
 * The representation of an account of the platform.
 */
export interface UserListItemResource {
  /** The identifier of the account. */
  readonly uuid: string;
  /** The address of the account. */
  readonly email: string;
  /** The first name of the account. */
  readonly firstName: string;
  /** The last name of the account. */
  readonly lastName: string;
  /** The state of the account. */
  readonly status: UserStatusResource;
}

/**
 * A page of accounts.
 */
export interface UserPageResource {
  readonly items: readonly UserListItemResource[];
  /** The number of the page, starting at one. */
  readonly page: number;
  /** The number of pages of the listing. */
  readonly totalPages: number;
  /** The number of records that match the query. */
  readonly total: number;
}

/**
 * The body of the invitation of a member.
 */
export interface InviteUserRequestResource {
  /** The address that receives the invitation. */
  readonly email: string;
}

/**
 * The answer of a successful invitation.
 *
 * The credential of the invitation is never part of the answer.
 */
export interface InvitationCreatedResource {
  /** The address that received the invitation. */
  readonly email: string;
  /** The state of the invited account. */
  readonly status: 'pending';
  /** The lifetime of the invitation, in seconds. */
  readonly expiresIn: number;
}

/**
 * The invitation that a token addresses.
 *
 * The address is the one that the invitation bound: it is never written by
 * the invited member.
 */
export interface InvitationDetailsResource {
  /** The address that received the invitation. */
  readonly email: string;
}

/**
 * The body of the acceptance of an invitation.
 *
 * The address is not part of the body: the invitation already carries it.
 */
export interface AcceptInvitationRequestResource {
  readonly firstName: string;
  readonly lastName: string;
  readonly password: string;
}

/**
 * The representation of an account that the platform manages.
 */
export interface ManagedUserResource {
  /** The identifier of the account. */
  readonly uuid: string;
  /** The address of the account. */
  readonly email: string;
  /** The first name of the account. */
  readonly firstName: string;
  /** The last name of the account. */
  readonly lastName: string;
  /** The state of the account. */
  readonly status: UserStatusResource;
}
