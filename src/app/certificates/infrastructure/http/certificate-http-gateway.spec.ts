import '@angular/compiler';
import { HttpClient } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { API_BASE_URL } from '../../../api.config';
import { CertificateHttpGateway } from './certificate-http-gateway';

describe('paginación de certificados', () => {
  function setup() {
    const requests: { url: string; params: Record<string, string> }[] = [];
    const injector = Injector.create({
      providers: [
        { provide: API_BASE_URL, useValue: '/api/v1' },
        {
          provide: HttpClient,
          useValue: {
            get(url: string, options: { params: Record<string, string> }) {
              requests.push({ url, params: options.params });
              return of({ items: [], page: 3, total: 45, totalPages: 3 });
            },
          },
        },
      ],
    });
    const gateway = runInInjectionContext(injector, () => new CertificateHttpGateway());
    return { gateway, requests };
  }

  it('conserva los totales del historial y envía página, tamaño, búsqueda y estado', async () => {
    const { gateway, requests } = setup();
    const result = await gateway.listCertificates({
      page: 3,
      limit: 20,
      search: ' Ana ',
      status: 'ANNULLED',
    });
    expect(result).toEqual({ items: [], page: 3, total: 45, totalPages: 3 });
    expect(requests).toEqual([
      {
        url: '/api/v1/certificates',
        params: { page: '3', limit: '20', q: 'Ana', status: 'ANNULLED' },
      },
    ]);
  });

  it('conserva los totales de pendientes y filtra por servicio en el servidor', async () => {
    const { gateway, requests } = setup();
    const result = await gateway.listEligibleAssignments({
      page: 3,
      limit: 20,
      serviceId: 'service-id',
    });
    expect(result.totalPages).toBe(3);
    expect(result.total).toBe(45);
    expect(requests[0]).toEqual({
      url: '/api/v1/certificates/eligible-assignments',
      params: { page: '3', limit: '20', serviceId: 'service-id' },
    });
  });

  it('pide la primera página cuando no se indica una y omite búsquedas vacías', async () => {
    const { gateway, requests } = setup();
    await gateway.listCertificates({ search: '  ' });
    expect(requests[0].params).toEqual({ page: '1' });
  });
});
