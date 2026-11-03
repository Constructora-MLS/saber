import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { GroupGateway } from '../../infrastructure/gateways/group.gateway';
import { GetGroupQueryService, ListGroupMembersQueryService, ListGroupsQueryService } from './group-query-services';

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

describe('ListGroupMembersQueryService', () => {
  it('reads the members of the role with its pagination', async () => {
    const listGroupMembers = vi
      .fn()
      .mockResolvedValue({ items: [], page: 1, totalPages: 0, total: 0 });
    const injector = Injector.create({
      providers: [{ provide: GroupGateway, useValue: { listGroupMembers } }],
    });
    const service = runInInjectionContext(injector, () => new ListGroupMembersQueryService());

    await service.execute({ uuid: '2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e', limit: 20, page: 2 });

    expect(listGroupMembers).toHaveBeenCalledWith('2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e', {
      limit: 20,
      page: 2,
    });
  });

  it('refuses an identifier that is not the identifier of a record', async () => {
    const listGroupMembers = vi.fn();
    const injector = Injector.create({
      providers: [{ provide: GroupGateway, useValue: { listGroupMembers } }],
    });
    const service = runInInjectionContext(injector, () => new ListGroupMembersQueryService());

    await expect(service.execute({ uuid: 'not-a-uuid' })).rejects.toMatchObject({
      name: 'GroupValidationError',
    });
    expect(listGroupMembers).not.toHaveBeenCalled();
  });
});
