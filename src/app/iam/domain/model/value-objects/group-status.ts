import { GroupValidationError } from '../errors/group-errors';

/** The lifecycle states of a group published by the API. */
export type GroupStatus = 'active' | 'deleted';

/** parseGroupStatus validates a group lifecycle state. */
export function parseGroupStatus(value: string): GroupStatus {
  if (value !== 'active' && value !== 'deleted') {
    throw new GroupValidationError('status', 'El estado del grupo no es válido.');
  }
  return value;
}

/** restoreGroupStatus trusts a status returned by the backend. */
export function restoreGroupStatus(value: GroupStatus): GroupStatus {
  return value;
}
