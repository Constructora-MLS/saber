import { describe, expect, it } from 'vitest';
import { CatalogValidationError } from '../errors/catalog-errors';
import { CatalogName } from './catalog-name';
import { Description } from './description';
import { UnitCode } from './unit-code';

describe('catalog value objects', () => {
  it('parses and restores immutable primitive catalog names', () => {
    expect(CatalogName.create('  Oficina  ')).toBe('Oficina');
    expect(CatalogName.restore('Oficina')).toBe('Oficina');
    expect(CatalogName.create('a'.repeat(120))).toHaveLength(120);
    expect(() => CatalogName.create('x')).toThrow(CatalogValidationError);
    expect(() => CatalogName.create('a'.repeat(121))).toThrow(CatalogValidationError);
    expect(() => CatalogName.create('nombre\u0000')).toThrow(CatalogValidationError);
  });

  it('parses and restores immutable primitive descriptions', () => {
    expect(Description.create('  Texto  ')).toBe('Texto');
    expect(Description.create('  ')).toBe('');
    expect(Description.restore('Texto')).toBe('Texto');
    expect(Description.create('a'.repeat(500))).toHaveLength(500);
    expect(() => Description.create('a'.repeat(501))).toThrow(CatalogValidationError);
    expect(() => Description.create('texto\u0000')).toThrow(CatalogValidationError);
  });

  it('parses and restores immutable primitive unit codes', () => {
    expect(UnitCode.create('ABC-123')).toBe('ABC-123');
    expect(UnitCode.restore('ABC-123')).toBe('ABC-123');
    expect(() => UnitCode.create('not-a-code')).toThrow(CatalogValidationError);
  });
});
