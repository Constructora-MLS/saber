import { GroupValidationError } from '../errors/group-errors';

/** The minimum accepted length of a group name. */
export const GROUP_NAME_MIN_LENGTH = 2;
/** The maximum accepted length of a group name. */
export const GROUP_NAME_MAX_LENGTH = 120;

/** GroupName is a validated, trimmed name of a group. */
export type GroupName = string & { readonly __groupName: unique symbol };

/** parseGroupName validates and trims a group name using the backend rules. */
export function parseGroupName(raw: string): GroupName {
  const name = raw.trim();
  const length = [...name].length;
  if (length < GROUP_NAME_MIN_LENGTH || length > GROUP_NAME_MAX_LENGTH) {
    throw new GroupValidationError(
      'name',
      `El nombre debe tener entre ${GROUP_NAME_MIN_LENGTH} y ${GROUP_NAME_MAX_LENGTH} caracteres.`,
    );
  }
  if (
    [...name].some((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code < 0x20 || (code >= 0x7f && code <= 0x9f);
    })
  ) {
    throw new GroupValidationError('name', 'El nombre contiene caracteres no permitidos.');
  }
  return name as GroupName;
}

/** restoreGroupName trusts a name already accepted by the backend. */
export function restoreGroupName(value: string): GroupName {
  return value as GroupName;
}

/** GroupName exposes the parser and trusted restoration factories. */
export const GroupName = {
  create: parseGroupName,
  restore: restoreGroupName,
} as const;
