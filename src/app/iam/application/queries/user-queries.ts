// Package queries holds the queries of the IAM bounded context.
//
// A query requests information without changing the state of the context.
// package queries

import { FilterableUserStatus } from '../../domain/model/value-objects/user-status';

/**
 * UserPage is a page of accounts of the platform.
 */
export interface UserPage<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly totalPages: number;
  readonly total: number;
}

/**
 * UserCriteria are the filters of a listing of accounts.
 */
export interface UserCriteria {
  readonly search?: string;
  readonly status?: FilterableUserStatus;
  readonly limit?: number;
  readonly page?: number;
}

/**
 * ListUsersQuery asks for a page of the accounts of the platform.
 */
export interface ListUsersQuery {
  /** The term searched in the names and in the address of the account. */
  readonly search?: string;
  /** The state the accounts are filtered by. */
  readonly status?: FilterableUserStatus;
  /** The size of the page. */
  readonly limit?: number;
  /** The number of the requested page, starting at one. */
  readonly page?: number;
}

/**
 * GetInvitationQuery asks for the address that an invitation bound.
 */
export interface GetInvitationQuery {
  /** The credential of the invitation. */
  readonly token: string;
}
