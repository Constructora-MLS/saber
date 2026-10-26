import { describe, expect, it } from 'vitest';
import { normalizeCatalogSearch } from './catalog-search';

describe('normalizeCatalogSearch', () => {
  it('descarta el término que la plataforma rechazaría', () => {
    expect(normalizeCatalogSearch('a')).toBeUndefined();
    expect(normalizeCatalogSearch('  ')).toBeUndefined();
    expect(normalizeCatalogSearch(undefined)).toBeUndefined();
  });

  it('conserva el término que la plataforma acepta', () => {
    expect(normalizeCatalogSearch(' obra ')).toBe('obra');
  });
});
