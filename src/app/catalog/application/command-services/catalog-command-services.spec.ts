import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { CatalogValidationError } from '../../domain/model/errors/catalog-errors';
import { CatalogGateway } from '../../infrastructure/gateways/catalog.gateway';
import { CreateWorkUnitCommandService } from './catalog-command-services';

describe('CreateWorkUnitCommandService', () => {
  it('rejects an empty service id before calling the gateway', async () => {
    const createWorkUnit = vi.fn();
    const injector = Injector.create({ providers: [{ provide: CatalogGateway, useValue: { createWorkUnit } }] });
    const service = runInInjectionContext(injector, () => new CreateWorkUnitCommandService());
    await expect(service.execute({ name: 'Unidad válida', description: null, serviceId: '  ' })).rejects.toMatchObject({
      name: 'CatalogValidationError',
      field: 'serviceId',
    });
    expect(createWorkUnit).not.toHaveBeenCalled();
  });
});
