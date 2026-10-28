import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { CatalogReferenceAcl } from '../../infrastructure/acl/catalog-reference.acl';
import { EmployeeGateway } from '../../infrastructure/gateways/employee.gateway';
import { GetWorkerRecordQueryService } from './assignment-query-services';

describe('GetWorkerRecordQueryService', () => {
  it('propagates employee lookup failures instead of reporting a missing worker', async () => {
    const failure = new Error('API unavailable');
    const injector = Injector.create({
      providers: [
        { provide: EmployeeGateway, useValue: { findEmployee: async () => { throw failure; } } },
        { provide: CatalogReferenceAcl, useValue: { resolveRegimes: async () => new Map() } },
      ],
    });
    const service = runInInjectionContext(injector, () => new GetWorkerRecordQueryService());

    await expect(service.execute('123e4567-e89b-12d3-a456-426614174000')).rejects.toBe(failure);
  });
});
