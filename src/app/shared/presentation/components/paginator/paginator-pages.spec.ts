import { describe, expect, it } from 'vitest';
import { visiblePages } from './paginator-pages';

describe('visiblePages', () => {
  it('no muestra páginas cuando el listado tiene una sola', () => {
    expect(visiblePages(1, 1)).toEqual([]);
    expect(visiblePages(1, 0)).toEqual([]);
  });

  it('muestra todas las páginas de un listado corto', () => {
    expect(visiblePages(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(visiblePages(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('muestra la primera y la última página de un listado largo', () => {
    expect(visiblePages(1, 33)).toEqual([1, 2, null, 33]);
    expect(visiblePages(33, 33)).toEqual([1, null, 32, 33]);
  });

  it('muestra las páginas que rodean la actual', () => {
    expect(visiblePages(10, 33)).toEqual([1, null, 9, 10, 11, null, 33]);
  });

  it('nunca muestra más de cinco páginas y dos elipsis', () => {
    for (let current = 1; current <= 33; current++) {
      const items = visiblePages(current, 33);
      const pages = items.filter((item) => item !== null);
      const gaps = items.filter((item) => item === null);

      expect(pages.length).toBeLessThanOrEqual(5);
      expect(gaps.length).toBeLessThanOrEqual(2);
      expect(pages).toContain(1);
      expect(pages).toContain(33);
      expect(pages).toContain(current);
    }
  });
});
