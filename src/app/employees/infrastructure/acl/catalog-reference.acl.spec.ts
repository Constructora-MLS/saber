import '@angular/compiler';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../../api.config';
import { CatalogReferenceAcl } from './catalog-reference.acl';

describe('CatalogReferenceAcl', () => {
  it('translates a Catalog work-unit resource into an Employees reference', async () => {
    const get = vi.fn((_url: string, _options: { params: HttpParams }) =>
      of({
        items: [
          {
            uuid: 'unit-1',
            code: 'OB-021',
            name: 'Mejoramiento del puente',
            serviceName: 'Obras civiles',
            status: 'ACTIVE' as const,
          },
        ],
      }),
    );
    const injector = Injector.create({
      providers: [
        { provide: API_BASE_URL, useValue: '/api/v1' },
        { provide: HttpClient, useValue: { get } },
      ],
    });
    const acl = runInInjectionContext(injector, () => new CatalogReferenceAcl());

    const references = await acl.resolveWorkUnits(['unit-1']);

    expect(references.get('unit-1')).toEqual({
      id: 'unit-1',
      code: 'OB-021',
      name: 'Mejoramiento del puente',
      serviceName: 'Obras civiles',
      availability: 'ACTIVE',
    });
    expect(get.mock.calls[0][0]).toBe('/api/v1/work-units');
    expect(get.mock.calls[0][1].params.get('ids')).toBe('unit-1');
  });
});
