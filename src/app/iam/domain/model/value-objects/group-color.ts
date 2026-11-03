import { GroupValidationError } from '../errors/group-errors';

/** GroupColor is a hexadecimal color accepted by the backend. */
export type GroupColor = string & { readonly __groupColor: unique symbol };

/** parseGroupColor validates and uppercases a hexadecimal group color. */
export function parseGroupColor(raw: string): GroupColor {
  if (!/^#[0-9A-Fa-f]{6}$/.test(raw)) {
    throw new GroupValidationError('color', 'El color debe usar el formato hexadecimal #RRGGBB.');
  }
  return raw.toUpperCase() as GroupColor;
}

/** restoreGroupColor trusts a color already accepted by the backend. */
export function restoreGroupColor(value: string): GroupColor {
  return value as GroupColor;
}

/** GroupColor exposes the parser and trusted restoration factories. */
export const GroupColor = {
  create: parseGroupColor,
  restore: restoreGroupColor,
} as const;
