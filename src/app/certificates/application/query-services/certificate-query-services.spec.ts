import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { ListingCriteria } from '../queries/certificate-queries';
import { CertificateGateway } from '../../infrastructure/gateways/certificate.gateway';
import {
  ListCertificateQueueQueryService,
  ListCertificatesQueryService,
} from './certificate-query-services';

describe('listados paginados de certificados', () => {
  it('propaga los totales de pendientes sin consultar el historial de cada asignación', async () => {
    let received: ListingCriteria | undefined;
    const assignment = { assignmentId: 'assignment-id', serviceId: 'service-id' };
    const injector = Injector.create({
      providers: [
        {
          provide: CertificateGateway,
          useValue: {
            async listEligibleAssignments(criteria: ListingCriteria) {
              received = criteria;
              return { items: [assignment], page: 2, total: 21, totalPages: 2 };
            },
            listAssignmentCertificates() {
              throw new Error('No deben pedirse historiales por fila');
            },
          },
        },
      ],
    });
    const service = runInInjectionContext(injector, () => new ListCertificateQueueQueryService());
    const result = await service.execute({ page: 2, search: 'Ana', serviceId: 'service-id' });
    expect(received).toEqual({ page: 2, limit: 20, search: 'Ana', serviceId: 'service-id' });
    expect(result).toEqual({ items: [{ assignment }], page: 2, total: 21, totalPages: 2 });
  });

  it('conserva los metadatos de historial y los filtros al cambiar de página', async () => {
    const result = { items: [], page: 4, total: 65, totalPages: 4 };
    let received: unknown;
    const injector = Injector.create({
      providers: [
        {
          provide: CertificateGateway,
          useValue: {
            async listCertificates(criteria: unknown) {
              received = criteria;
              return result;
            },
          },
        },
      ],
    });
    const service = runInInjectionContext(injector, () => new ListCertificatesQueryService());
    expect(await service.execute({ page: 4, limit: 20, search: 'Ana', status: 'ANNULLED' })).toBe(
      result,
    );
    expect(received).toEqual({ page: 4, limit: 20, search: 'Ana', status: 'ANNULLED' });
  });
});
