import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { GroupGateway } from '../../infrastructure/gateways/group.gateway';
import { ListGroupsQueryService } from './group-query-services';

describe('ListGroupsQueryService', () => {
  it('forwards the trimmed search term and pagination to the gateway', async () => {
    const listGroups = vi.fn().mockResolvedValue({ items: [], page: 1, totalPages: 0, total: 0 });
    const injector = Injector.create({
      providers: [{ provide: GroupGateway, useValue: { listGroups } }],
    });
    const service = runInInjectionContext(injector, () => new ListGroupsQueryService());

    await service.execute({ search: '  Operaciones  ', limit: 100, page: 1 });

    expect(listGroups).toHaveBeenCalledWith({ search: 'Operaciones', limit: 100, page: 1 });
  });

  it('omits a blank search term instead of asking for local filtering', async () => {
    const listGroups = vi.fn().mockResolvedValue({ items: [], page: 1, totalPages: 0, total: 0 });
    const injector = Injector.create({
      providers: [{ provide: GroupGateway, useValue: { listGroups } }],
    });
    const service = runInInjectionContext(injector, () => new ListGroupsQueryService());

    await service.execute({ search: '   ', limit: 100, page: 1 });

    expect(listGroups).toHaveBeenCalledWith({ limit: 100, page: 1 });
  });
});
