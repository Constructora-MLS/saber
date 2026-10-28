import '@angular/compiler';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { API_BASE_URL } from '../../../api.config';
import { CatalogApiError } from '../errors/catalog-api.error';
import { CatalogGateway } from './catalog.gateway';

describe('CatalogGateway', () => {
  it('traduce y propaga el error HTTP del contrato sin devolver una página vacía', async () => {
    const backendError = new HttpErrorResponse({
      status: 409,
      error: {
        type: 'about:blank',
        title: 'Conflict',
        status: 409,
        code: 'work_unit_code_already_exists',
        detail: 'The work unit code is already in use.',
        errors: [],
      },
    });
    const injector = Injector.create({ providers: [
      { provide: API_BASE_URL, useValue: '/api/v1' },
      { provide: HttpClient, useValue: { get: () => throwError(() => backendError) } },
    ] });
    const gateway = runInInjectionContext(injector, () => new CatalogGateway());

    await expect(gateway.listServices({ page: 1 })).rejects.toMatchObject({
      name: 'CatalogApiError',
      status: 409,
      code: 'work_unit_code_already_exists',
      detail: 'The work unit code is already in use.',
    });
    await expect(gateway.listServices({ page: 1 })).rejects.toBeInstanceOf(CatalogApiError);
  });

  it.each([
    [404, 'not_found', 'The resource was not found.'],
    [503, 'database_unavailable', 'The database is not available.'],
  ])('propaga el problema real de catálogo con estado %i y código %s', async (status, code, detail) => {
    const backendError = new HttpErrorResponse({
      status,
      error: { type: 'about:blank', title: 'Error', status, code, detail, errors: [] },
    });
    const injector = Injector.create({ providers: [
      { provide: API_BASE_URL, useValue: '/api/v1' },
      { provide: HttpClient, useValue: { get: () => throwError(() => backendError) } },
    ] });
    const gateway = runInInjectionContext(injector, () => new CatalogGateway());

    await expect(gateway.listServices({ page: 1 })).rejects.toMatchObject({
      name: 'CatalogApiError', status, code, detail,
    });
  });
});
