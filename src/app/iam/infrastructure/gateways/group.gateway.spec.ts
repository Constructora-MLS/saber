import '@angular/compiler';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../../api.config';
import { GroupColor } from '../../domain/model/value-objects/group-color';
import { GroupId } from '../../domain/model/value-objects/group-id';
import { GroupName } from '../../domain/model/value-objects/group-name';
import { GroupGateway } from './group.gateway';

const groupId = '2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e';
const resource = {
  uuid: groupId,
  name: 'Supervisión',
  color: '#13579B',
  priority: 1,
  permissions: {
    manageEmployees: true,
    manageAssignments: false,
    manageCatalog: false,
    manageCertificates: false,
    manageUsers: false,
    managePermissionsGroups: true,
    administrator: false,
  },
  status: 'active' as const,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function gatewayFor(client: Record<string, unknown>): GroupGateway {
  const injector = Injector.create({
    providers: [
      { provide: API_BASE_URL, useValue: '/api/v1' },
      { provide: HttpClient, useValue: client as Partial<HttpClient> as HttpClient },
    ],
  });
  return runInInjectionContext(injector, () => new GroupGateway());
}

describe('GroupGateway', () => {
  it('requests the complete 100-item first page and maps groups to the domain', async () => {
    const get = vi.fn((_url: string, _options?: { params?: HttpParams }) =>
      of({ items: [resource], page: 1, totalPages: 1, total: 1 }),
    );
    const gateway = gatewayFor({ get });

    const page = await gateway.listGroups({ limit: 100, page: 1 });

    expect(page.items[0]?.name).toBe('Supervisión');
    expect(page.items[0]?.priority).toBe(1);
    expect(page.items[0]?.permissions.manageEmployees).toBe(true);
    expect(page.total).toBe(1);
    const [url, options] = get.mock.calls[0];
    expect(url).toBe('/api/v1/groups');
    expect(options?.params?.get('limit')).toBe('100');
    expect(options?.params?.get('page')).toBe('1');
  });

  it('sends a name search to the groups endpoint', async () => {
    const get = vi.fn((_url: string, _options?: { params?: HttpParams }) =>
      of({ items: [resource], page: 1, totalPages: 1, total: 1 }),
    );
    const gateway = gatewayFor({ get });

    await gateway.listGroups({ search: 'Supervisión', limit: 100, page: 1 });

    const [, options] = get.mock.calls[0];
    expect(options?.params?.get('search')).toBe('Supervisión');
    expect(options?.params?.get('limit')).toBe('100');
    expect(options?.params?.get('page')).toBe('1');
  });

  it('creates a group with only its name and color using POST /groups', async () => {
    const post = vi.fn((_url: string, _body: unknown) => of(resource));
    const gateway = gatewayFor({ post });

    const created = await gateway.createGroup({
      name: GroupName.restore('Supervisión'),
      color: GroupColor.restore('#13579B'),
    });

    expect(created.name).toBe('Supervisión');
    expect(post).toHaveBeenCalledWith('/api/v1/groups', {
      name: 'Supervisión',
      color: '#13579B',
    });
  });

  it('translates group creation conflicts without exposing backend details', async () => {
    const gateway = gatewayFor({
      post: () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { code: 'group_limit_reached', detail: 'English backend detail.' },
            }),
        ),
    });

    await expect(
      gateway.createGroup({
        name: GroupName.restore('Supervisión'),
        color: GroupColor.restore('#13579B'),
      }),
    ).rejects.toMatchObject({ name: 'GroupApiError', status: 409, code: 'group_limit_reached' });
  });

  it('reads current details from the group resource endpoint', async () => {
    const get = vi.fn(() => of(resource));
    const gateway = gatewayFor({ get });

    const group = await gateway.getGroup(GroupId.restore(groupId));

    expect(group.name).toBe('Supervisión');
    expect(group.permissions.managePermissionsGroups).toBe(true);
    expect(get).toHaveBeenCalledWith(`/api/v1/groups/${groupId}`);
  });

  it('sends a flat partial patch and preserves an explicit false permission', async () => {
    const patch = vi.fn(() =>
      of({ ...resource, permissions: { ...resource.permissions, manageUsers: false } }),
    );
    const gateway = gatewayFor({ patch });

    const updated = await gateway.updateGroup(GroupId.restore(groupId), {
      name: GroupName.restore('Supervisión'),
      color: GroupColor.restore('#13579B'),
      permissions: { manageUsers: false },
    });

    expect(updated.permissions.manageUsers).toBe(false);
    expect(patch).toHaveBeenCalledWith(`/api/v1/groups/${groupId}`, {
      name: 'Supervisión',
      color: '#13579B',
      manageUsers: false,
    });
  });

  it.each([
    'manageEmployees',
    'manageAssignments',
    'manageCatalog',
    'manageCertificates',
    'manageUsers',
    'managePermissionsGroups',
    'administrator',
  ] as const)('preserves false when the %s permission is switched off', async (permission) => {
    const patch = vi.fn(() => of(resource));
    const gateway = gatewayFor({ patch });

    await gateway.updateGroup(GroupId.restore(groupId), { permissions: { [permission]: false } });

    expect(patch).toHaveBeenCalledWith(`/api/v1/groups/${groupId}`, { [permission]: false });
  });

  it('orders every group by the supplied highest-to-lowest identifier list', async () => {
    const put = vi.fn(() => of(null));
    const gateway = gatewayFor({ put });

    const secondId = '3f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e';
    await gateway.reorderGroups([GroupId.restore(groupId), GroupId.restore(secondId)]);

    expect(put).toHaveBeenCalledWith('/api/v1/groups/order', {
      groupIds: [groupId, secondId],
    });
  });

  it('uses DELETE for the backend logical-deletion operation', async () => {
    const remove = vi.fn(() => of(null));
    const gateway = gatewayFor({ delete: remove });

    await gateway.deleteGroup(GroupId.restore(groupId));

    expect(remove).toHaveBeenCalledWith(`/api/v1/groups/${groupId}`);
  });

  it('translates hierarchy conflicts and permission refusals from problem details', async () => {
    const gateway = gatewayFor({
      put: () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { code: 'group_order_conflict', detail: 'The hierarchy changed.' },
            }),
        ),
    });

    await expect(gateway.reorderGroups([GroupId.restore(groupId)])).rejects.toMatchObject({
      name: 'GroupApiError',
      status: 409,
      code: 'group_order_conflict',
    });
  });

  it('maps a forbidden edit without exposing the backend payload as a message', async () => {
    const gateway = gatewayFor({
      patch: () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 403,
              error: { code: 'forbidden', detail: 'English backend detail.' },
            }),
        ),
    });

    await expect(
      gateway.updateGroup(GroupId.restore(groupId), { permissions: { manageUsers: true } }),
    ).rejects.toMatchObject({ name: 'GroupApiError', status: 403, code: 'forbidden' });
  });
});
