import '@angular/compiler';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { of, throwError } from 'rxjs';
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

  it('filtra el historial por obra y omite el filtro cuando no hay obra', async () => {
    const { gateway, requests } = setup();
    await gateway.listCertificates({ page: 1, workUnitCode: 'OB-021' });
    expect(requests[0].params).toEqual({ page: '1', workUnitCode: 'OB-021' });
    await gateway.listCertificates({ page: 1, workUnitCode: '' });
    expect(requests[1].params).toEqual({ page: '1' });
  });

  it('lleva el nombre archivado del servicio a los datos del certificado', async () => {
    const injector = Injector.create({
      providers: [
        { provide: API_BASE_URL, useValue: '/api/v1' },
        {
          provide: HttpClient,
          useValue: {
            get() {
              return of({
                items: [
                  {
                    id: 'cert-1',
                    assignmentId: 'asg-1',
                    serviceId: 'svc-1',
                    status: 'ISSUED',
                    templateSnapshot: 'texto',
                    dataSnapshot: {
                      'employee.firstName': 'Ana',
                      'employee.lastName': 'López',
                      'employee.dni': '12345678',
                      'assignment.position': 'Operaria',
                      'assignment.service': 'Ejecución de obras civiles',
                      'assignment.workUnit': 'Mejoramiento del puente La Molina',
                      'assignment.workUnitCode': 'OB-021',
                      'assignment.startDate': '2024-01-02',
                      'assignment.endDate': '2026-10-16',
                      issueDate: '2026-10-16',
                    },
                    issuedAt: '2026-10-16T10:00:00Z',
                  },
                ],
                page: 1,
                total: 1,
                totalPages: 1,
              });
            },
          },
        },
      ],
    });
    const gateway = runInInjectionContext(injector, () => new CertificateHttpGateway());

    const page = await gateway.listCertificates({ page: 1 });

    expect(page.items[0].snapshot.service).toBe('Ejecución de obras civiles');
    expect(page.items[0].snapshot.workUnit).toBe('Mejoramiento del puente La Molina');
  });
});

describe('PDF público', () => {
  it('pide el archivo por código sin usar un UUID', async () => {
    const requests: string[] = [];
    const pdf = new Blob(['%PDF-public']);
    const injector = Injector.create({
      providers: [
        { provide: API_BASE_URL, useValue: '/api/v1' },
        {
          provide: HttpClient,
          useValue: {
            get: (url: string) => {
              requests.push(url);
              return of(pdf);
            },
          },
        },
      ],
    });
    const gateway = runInInjectionContext(injector, () => new CertificateHttpGateway());
    expect(await gateway.downloadPublicCertificateFile('MLS-7K9D2Q8M5P')).toBe(pdf);
    expect(requests).toEqual(['/api/v1/certificates/verify/MLS-7K9D2Q8M5P/file']);
  });
});

describe('verificación de certificados', () => {
  function setup() {
    const requests: string[] = [];
    const injector = Injector.create({
      providers: [
        { provide: API_BASE_URL, useValue: '/api/v1' },
        {
          provide: HttpClient,
          useValue: {
            get(url: string) {
              requests.push(url);
              return of({
                code: 'MLS-7K9D2Q8M5P',
                status: 'ISSUED',
                data: {
                  'employee.firstName': 'Ana',
                  'employee.lastName': 'López',
                  'assignment.position': 'Operaria',
                  'assignment.workUnit': 'Mejoramiento del puente La Molina',
                  'assignment.workUnitCode': 'OB-021',
                  'assignment.startDate': '2024-01-02',
                  'assignment.endDate': '2026-10-16',
                },
                issuedAt: '2026-10-16T10:00:00Z',
              });
            },
          },
        },
      ],
    });
    const gateway = runInInjectionContext(injector, () => new CertificateHttpGateway());
    return { gateway, requests };
  }

  it('consulta el certificado por su código público', async () => {
    const { gateway, requests } = setup();

    const verification = await gateway.verifyCertificate('MLS-7K9D2Q8M5P');

    expect(requests).toEqual(['/api/v1/certificates/verify/MLS-7K9D2Q8M5P']);
    expect(verification?.code).toBe('MLS-7K9D2Q8M5P');
    expect(verification?.isIssued).toBe(true);
    expect(verification?.snapshot.fullName).toBe('Ana López');
    expect(verification).not.toHaveProperty('annulledAt');
    expect(verification).not.toHaveProperty('annulmentReason');
  });

  it('no publica el documento de identidad en la verificación pública', async () => {
    const { gateway } = setup();

    const verification = await gateway.verifyCertificate('MLS-7K9D2Q8M5P');

    expect(verification?.snapshot.dni).toBe('');
    expect(verification?.snapshot.fields.has('employee.dni')).toBe(false);
  });

  for (const status of [404, 500]) {
    it(`traduce HTTP ${status} sin revelar auditoría`, async () => {
      const injector = Injector.create({
        providers: [
          { provide: API_BASE_URL, useValue: '/api/v1' },
          {
            provide: HttpClient,
            useValue: {
              get: () => throwError(() => new HttpErrorResponse({ status })),
            },
          },
        ],
      });
      const gateway = runInInjectionContext(injector, () => new CertificateHttpGateway());
      if (status === 404) {
        expect(await gateway.verifyCertificate('MLS-7K9D2Q8M5P')).toBeNull();
      } else {
        await expect(gateway.verifyCertificate('MLS-7K9D2Q8M5P')).rejects.toMatchObject({
          status: 500,
        });
      }
    });
  }
});
