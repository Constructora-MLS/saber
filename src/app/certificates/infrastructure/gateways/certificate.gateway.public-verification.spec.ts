import '@angular/compiler';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { API_BASE_URL } from '../../../api.config';
import { CertificateGateway } from './certificate.gateway';
import { hasSnapshotField, SNAPSHOT_FIELD } from '../../domain/model/value-objects/certificate-snapshot';


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
    const gateway = runInInjectionContext(injector, () => new CertificateGateway());
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
    const gateway = runInInjectionContext(injector, () => new CertificateGateway());
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
    expect(
      verification && hasSnapshotField(verification.snapshot, SNAPSHOT_FIELD.employeeDni),
    ).toBe(false);
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
      const gateway = runInInjectionContext(injector, () => new CertificateGateway());
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
