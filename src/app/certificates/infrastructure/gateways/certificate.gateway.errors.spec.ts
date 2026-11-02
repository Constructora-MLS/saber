import '@angular/compiler';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { API_BASE_URL } from '../../../api.config';
import { CertificateGateway } from './certificate.gateway';
import { CertificateApiError } from '../errors/certificate-api.error';
import { restoreCertificateId } from '../../domain/model/value-objects/certificate-id';

describe('errores de la API de certificados', () => {
  function gatewayFor(error: HttpErrorResponse) {
    const injector = Injector.create({
      providers: [
        { provide: API_BASE_URL, useValue: '/api/v1' },
        {
          provide: HttpClient,
          useValue: {
            post: () => throwError(() => error),
            get: () => throwError(() => error),
          },
        },
      ],
    });
    return runInInjectionContext(injector, () => new CertificateGateway());
  }

  it('preserva los errores de validación por campo de la anulación', async () => {
    const gateway = gatewayFor(
      new HttpErrorResponse({
        status: 400,
        error: {
          code: 'invalid_annulment_reason',
          detail: 'invalid reason',
          errors: [{ field: 'reason', message: 'too long' }],
        },
      }),
    );
    await expect(
      gateway.annulCertificate(restoreCertificateId('123e4567-e89b-12d3-a456-426614174000'), 'reason'),
    ).rejects.toMatchObject({
      status: 400,
      code: 'invalid_annulment_reason',
      fieldErrors: [{ field: 'reason', message: 'too long' }],
    });
  });

  it('preserva el código del conflicto de emisión', async () => {
    const gateway = gatewayFor(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'certificate_conflict', detail: 'internal English detail' },
      }),
    );
    await expect(gateway.issueCertificate('assignment')).rejects.toMatchObject({
      status: 409,
      code: 'certificate_conflict',
    });
  });

  it('lee document_not_found desde problem+json en una respuesta blob', async () => {
    const problem = new Blob(
      [JSON.stringify({ code: 'document_not_found', detail: 'missing archived file' })],
      { type: 'application/problem+json' },
    );
    const gateway = gatewayFor(new HttpErrorResponse({ status: 404, error: problem }));
    await expect(gateway.downloadCertificateFile(restoreCertificateId('123e4567-e89b-12d3-a456-426614174000')))
      .rejects.toMatchObject({ status: 404, code: 'document_not_found' } satisfies Partial<CertificateApiError>);
  });

  it('preserva storage_unavailable y el estado 503 en respuestas blob', async () => {
    const problem = new Blob(
      [JSON.stringify({ code: 'storage_unavailable', detail: 'private storage detail' })],
      { type: 'application/problem+json' },
    );
    const gateway = gatewayFor(new HttpErrorResponse({ status: 503, error: problem }));
    await expect(gateway.downloadCertificateFile(restoreCertificateId('123e4567-e89b-12d3-a456-426614174000')))
      .rejects.toMatchObject({ status: 503, code: 'storage_unavailable' });
  });
});
