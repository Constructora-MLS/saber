import '@angular/compiler';
import { HttpClient } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { API_BASE_URL } from '../../../api.config';
import { CatalogServiceAcl } from './catalog-service.acl';

function setup(
  items: readonly { readonly uuid: string; readonly code: string; readonly name: string }[],
) {
  const requests: { url: string; params: Record<string, string> }[] = [];
  const injector = Injector.create({
    providers: [
      { provide: API_BASE_URL, useValue: '/api/v1' },
      {
        provide: HttpClient,
        useValue: {
          get(
            url: string,
            options: { params: { keys(): string[]; get(name: string): string | null } },
          ) {
            const params = Object.fromEntries(
              options.params.keys().map((key) => [key, options.params.get(key) ?? '']),
            );
            requests.push({ url, params });
            return of({ items, page: 1, total: items.length, totalPages: 1 });
          },
        },
      },
    ],
  });
  const acl = runInInjectionContext(injector, () => new CatalogServiceAcl());
  return { acl, requests };
}

describe('catálogo de obras para el filtro de certificados', () => {
  it('pide una sola página de obras, nunca el catálogo completo', async () => {
    const { acl, requests } = setup([]);

    await acl.listWorkUnits();

    expect(requests[0].url).toBe('/api/v1/work-units');
    expect(requests[0].params).toEqual({ limit: '20', page: '1' });
  });

  it('busca las obras por el término que escribe el usuario', async () => {
    const { acl, requests } = setup([]);

    await acl.listWorkUnits('puente');

    expect(requests[0].params).toEqual({ limit: '20', page: '1', search: 'puente' });
  });

  it('no pregunta al catálogo por un término que la plataforma rechazaría', async () => {
    const { acl, requests } = setup([]);

    await acl.listWorkUnits('a');

    expect(requests[0].params).toEqual({ limit: '20', page: '1' });
  });

  it('devuelve el código y el nombre de las obras, sin las obras retiradas', async () => {
    const { acl } = setup([
      { uuid: 'id-1', code: 'OB-021', name: 'Mejoramiento del puente La Molina' },
    ]);

    expect(await acl.listWorkUnits('')).toEqual([
      { code: 'OB-021', name: 'Mejoramiento del puente La Molina' },
    ]);
  });
});
