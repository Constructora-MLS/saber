// Package valueobjects holds the value objects of the IAM bounded context.
// package valueobjects

/**
 * UserType is the kind of account of the platform.
 *
 * The platform has one account that is not a member: the Owner of the
 * platform. It holds every permission and the platform protects it: it
 * never joins a role and it never leaves one.
 */
export type UserType = 'owner' | 'member';

/** USER_TYPES are the kinds of account that the platform publishes. */
export const USER_TYPES: readonly UserType[] = ['owner', 'member'];

/**
 * userTypeLabel returns the label of a kind of account in the language of
 * the interfaces.
 */
export function userTypeLabel(type: UserType): string {
  switch (type) {
    case 'owner':
      return 'Propietario';
    case 'member':
      return 'Miembro';
  }
}
