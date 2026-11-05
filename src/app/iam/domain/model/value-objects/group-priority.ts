import { GroupValidationError } from '../errors/group-errors';

/** GroupPriority is the one-based position of a group in the hierarchy. */
export type GroupPriority = number & { readonly __groupPriority: unique symbol };

/** parseGroupPriority validates a one-based hierarchy position. */
export function parseGroupPriority(value: number): GroupPriority {
  if (!Number.isInteger(value) || value < 1) {
    throw new GroupValidationError('priority', 'La prioridad debe ser un número positivo.');
  }
  return value as GroupPriority;
}

/** restoreGroupPriority trusts a priority returned by the backend. */
export function restoreGroupPriority(value: number): GroupPriority {
  return value as GroupPriority;
}

/** GroupPriority exposes the parser and trusted restoration factories. */
export const GroupPriority = {
  create: parseGroupPriority,
  restore: restoreGroupPriority,
} as const;
