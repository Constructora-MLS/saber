// Package valueobjects holds the value objects of the IAM bounded context.
// package valueobjects

/**
 * UserStatus is the state of an account of the platform.
 *
 * A pending account was invited and never activated: it may not sign in
 * until it accepts the invitation. A deleted account was disabled: the
 * platform never lists it and it may not authenticate either.
 */
export type UserStatus = 'active' | 'pending';

/**
 * FilterableUserStatus is the state an account can be filtered by.
 *
 * The disabled accounts are never listed, so they are not a filter the
 * platform accepts.
 */
export type FilterableUserStatus = 'active' | 'pending';

/**
 * The states an account can be filtered by.
 *
 * The disabled accounts are never listed.
 */
export const FILTERABLE_USER_STATUSES: readonly FilterableUserStatus[] = ['active', 'pending'];

/**
 * userStatusLabel returns the label of a state in the language of the
 * interfaces.
 */
export function userStatusLabel(status: UserStatus): string {
  switch (status) {
    case 'active':
      return 'Activo';
    case 'pending':
      return 'Pendiente';
  }
}
