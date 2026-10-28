import '@angular/compiler';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { API_BASE_URL } from '../../../api.config';
import { CatalogApiError } from '../../../catalog/infrastructure/errors/catalog-api.error';
import { CatalogServiceAcl } from './catalog-service.acl';

describe('adaptador ACL de catálogo', () => {
  it('traduce errores del catálogo al tipo de error de ese contexto', async () => {
    const injector = Injector.create({
      providers: [
        { provide: API_BASE_URL, useValue: '/api/v1' },
        {
          provide: HttpClient,
          useValue: {
            get: () =>
              throwError(
                () =>
                  new HttpErrorResponse({
                    status: 400,
                    error: { code: 'invalid_search', detail: 'internal catalog detail' },
                  }),
              ),
          },
        },
      ],
    });
    const acl = runInInjectionContext(injector, () => new CatalogServiceAcl());

    await expect(acl.listWorkUnits('obra')).rejects.toBeInstanceOf(CatalogApiError);
    await expect(acl.listWorkUnits('obra')).rejects.toMatchObject({
      status: 400,
      code: 'invalid_search',
      detail: 'internal catalog detail',
    });
  });
});
