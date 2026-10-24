import { describe, expect, it } from 'vitest';
import { visiblePages } from './paginator-pages';

describe('visiblePages', () => {
  it('no muestra páginas cuando el listado tiene una sola', () => {
    expect(visiblePages(1, 1)).toEqual([]);
    expect(visiblePages(1, 0)).toEqual([]);
  });

  it('muestra la primera y la última página de un listado corto', () => {
    expect(visiblePages(1, 3)).toEqual([1, 2, 3]);
    expect(visiblePages(2, 3)).toEqual([1, 2, 3]);
  });

  it('muestra las páginas que rodean la actual en un listado largo', () => {
    expect(visiblePages(10, 20)).toEqual([1, 8, 9, 10, 11, 12, 20]);
  });

  it('no muestra páginas que no existen', () => {
    expect(visiblePages(1, 20)).toEqual([1, 2, 3, 20]);
    expect(visiblePages(20, 20)).toEqual([1, 18, 19, 20]);
  });
});
