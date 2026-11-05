import { describe, expect, it } from 'vitest';
import { GroupValidationError } from '../errors/group-errors';
import { parseGroupColor, restoreGroupColor } from './group-color';
import { parseGroupName, restoreGroupName } from './group-name';

describe('group name', () => {
  it('trims a valid name and enforces the backend length boundaries', () => {
    expect(parseGroupName('  Supervisión  ')).toBe('Supervisión');
    expect(() => parseGroupName('A')).toThrow(GroupValidationError);
    expect(() => parseGroupName('a'.repeat(121))).toThrow(GroupValidationError);
  });

  it('counts Unicode code points like the backend at both name boundaries', () => {
    expect(parseGroupName('á'.repeat(120))).toHaveLength(120);
    expect(() => parseGroupName('á'.repeat(121))).toThrow(
      expect.objectContaining({ field: 'name' }),
    );
    expect(parseGroupName('🛠️'.repeat(60))).toBe('🛠️'.repeat(60));
    expect(() => parseGroupName('😀'.repeat(121))).toThrow(
      expect.objectContaining({ field: 'name' }),
    );
  });

  it('rejects control characters without changing backend-owned values on restore', () => {
    expect(() => parseGroupName('Jefes\nObra')).toThrow(expect.objectContaining({ field: 'name' }));
    expect(restoreGroupName('Stored name')).toBe('Stored name');
  });
});

describe('group color', () => {
  it('normalizes the hexadecimal color and rejects values outside the backend format', () => {
    expect(parseGroupColor('#a1b2c3')).toBe('#A1B2C3');
    expect(() => parseGroupColor('#FFF')).toThrow(expect.objectContaining({ field: 'color' }));
    expect(restoreGroupColor('#a1b2c3')).toBe('#a1b2c3');
  });
});
