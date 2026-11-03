import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { GroupGateway } from '../../infrastructure/gateways/group.gateway';
import { GroupApiError } from '../../infrastructure/errors/group-api.error';
import { GroupId } from '../../domain/model/value-objects/group-id';
import {
  CreateGroupCommandService,
  ReorderGroupsCommandService,
  UpdateGroupCommandService,
} from './group-command-services';

const groupId = '2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e';
const secondGroupId = '3f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e';

function servicesFor(gateway: Record<string, unknown>) {
  const injector = Injector.create({
    providers: [{ provide: GroupGateway, useValue: gateway }],
  });
  return {
    create: runInInjectionContext(injector, () => new CreateGroupCommandService()),
    update: runInInjectionContext(injector, () => new UpdateGroupCommandService()),
    reorder: runInInjectionContext(injector, () => new ReorderGroupsCommandService()),
  };
}

describe('group command services', () => {
  it('validates and creates a group with only a trimmed name and normalized color', async () => {
    const createGroup = vi.fn().mockResolvedValue({});
    const { create } = servicesFor({ createGroup });

    await create.execute({ name: '  Supervisión  ', color: '#a1b2c3' });

    expect(createGroup).toHaveBeenCalledWith({ name: 'Supervisión', color: '#A1B2C3' });
  });

  it('refuses a color outside the backend hexadecimal format before reaching the gateway', async () => {
    const createGroup = vi.fn();
    const { create } = servicesFor({ createGroup });

    await expect(create.execute({ name: 'Operaciones', color: '#FFF' })).rejects.toMatchObject({
      name: 'GroupValidationError',
      field: 'color',
    });
    expect(createGroup).not.toHaveBeenCalled();
  });

  it('refuses an overlong group name before reaching the gateway', async () => {
    const createGroup = vi.fn();
    const { create } = servicesFor({ createGroup });

    await expect(create.execute({ name: 'a'.repeat(121), color: '#A1B2C3' })).rejects.toMatchObject({
      name: 'GroupValidationError',
      field: 'name',
    });
    expect(createGroup).not.toHaveBeenCalled();
  });

  it('does not swallow the backend refusal to register a group', async () => {
    const refusal = new GroupApiError(409, 'group_limit_reached', 'backend detail');
    const createGroup = vi.fn().mockRejectedValue(refusal);
    const { create } = servicesFor({ createGroup });

    await expect(create.execute({ name: 'Supervisión', color: '#A1B2C3' })).rejects.toBe(refusal);
  });

  it('validates changed fields but preserves an explicit false permission', async () => {
    const updateGroup = vi.fn().mockResolvedValue({});
    const { update } = servicesFor({ updateGroup });

    await update.execute({
      uuid: groupId,
      name: '  Supervisión  ',
      color: '#a1b2c3',
      permissions: { manageUsers: false },
    });

    expect(updateGroup).toHaveBeenCalledWith(GroupId.restore(groupId), {
      name: 'Supervisión',
      color: '#A1B2C3',
      permissions: { manageUsers: false },
    });
  });

  it('does not send an empty edit', async () => {
    const updateGroup = vi.fn();
    const { update } = servicesFor({ updateGroup });

    await expect(update.execute({ uuid: groupId, permissions: {} })).rejects.toMatchObject({
      name: 'GroupValidationError',
      field: 'group',
    });
    expect(updateGroup).not.toHaveBeenCalled();
  });

  it('does not swallow the backend authority refusal', async () => {
    const refusal = new GroupApiError(403, 'forbidden', 'backend detail');
    const updateGroup = vi.fn().mockRejectedValue(refusal);
    const { update } = servicesFor({ updateGroup });

    await expect(
      update.execute({ uuid: groupId, permissions: { manageUsers: true } }),
    ).rejects.toBe(refusal);
  });

  it('passes every requested group ID through in hierarchy order', async () => {
    const reorderGroups = vi.fn().mockResolvedValue(undefined);
    const { reorder } = servicesFor({ reorderGroups });

    await reorder.execute({ groupIds: [groupId, secondGroupId] });

    expect(reorderGroups).toHaveBeenCalledWith([
      GroupId.restore(groupId),
      GroupId.restore(secondGroupId),
    ]);
  });
});
