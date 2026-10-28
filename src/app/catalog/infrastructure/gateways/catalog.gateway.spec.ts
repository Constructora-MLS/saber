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
      error: { code: 'duplicate_name', detail: 'El nombre ya existe.', errors: [] },
    });
    const injector = Injector.create({ providers: [
      { provide: API_BASE_URL, useValue: '/api/v1' },
      { provide: HttpClient, useValue: { get: () => throwError(() => backendError) } },
    ] });
    const gateway = runInInjectionContext(injector, () => new CatalogGateway());

    await expect(gateway.listServices({ page: 1 })).rejects.toMatchObject({
      name: 'CatalogApiError', status: 409, code: 'duplicate_name', detail: 'El nombre ya existe.',
    });
    await expect(gateway.listServices({ page: 1 })).rejects.toBeInstanceOf(CatalogApiError);
  });
});
