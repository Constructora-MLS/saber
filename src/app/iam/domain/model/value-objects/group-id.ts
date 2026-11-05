import { GroupValidationError } from '../errors/group-errors';

/** GroupId identifies a group in the IAM bounded context. */
export type GroupId = string & { readonly __groupId: unique symbol };

/** parseGroupId validates a UUID supplied as a command identifier. */
export function parseGroupId(raw: string): GroupId {
  const value = raw.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new GroupValidationError('uuid', 'El identificador del grupo no es válido.');
  }
  return value as GroupId;
}

/** restoreGroupId trusts an identifier returned by the backend. */
export function restoreGroupId(value: string): GroupId {
  return value as GroupId;
}

/** GroupId exposes the parser and trusted restoration factories. */
export const GroupId = {
  create: parseGroupId,
  restore: restoreGroupId,
} as const;
