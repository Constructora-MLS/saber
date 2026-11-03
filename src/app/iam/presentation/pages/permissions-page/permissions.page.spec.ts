import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { UpdateGroupCommandService } from '../../../application/command-services/group-command-services';
import { GetGroupQueryService } from '../../../application/query-services/group-query-services';
import { Group } from '../../../domain/model/aggregates/group';
import { GroupApiError } from '../../../infrastructure/errors/group-api.error';
import { GroupColor } from '../../../domain/model/value-objects/group-color';
import { GroupId } from '../../../domain/model/value-objects/group-id';
import { GroupName } from '../../../domain/model/value-objects/group-name';
import { GroupPriority } from '../../../domain/model/value-objects/group-priority';
import { restoreGroupStatus } from '../../../domain/model/value-objects/group-status';
import { PermissionsPage } from './permissions.page';

function group(name = 'Supervisión'): Group {
  return Group.restore({
    id: GroupId.restore('2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e'),
    name: GroupName.restore(name),
    color: GroupColor.restore('#13579B'),
    priority: GroupPriority.restore(1),
    permissions: {
      manageEmployees: false,
      manageAssignments: false,
      manageCatalog: false,
      manageCertificates: false,
      manageUsers: false,
      managePermissionsGroups: false,
      administrator: false,
    },
    status: restoreGroupStatus('active'),
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  });
}

describe('PermissionsPage', () => {
  function setup(
    options: {
      readonly get?: (query: { uuid: string }) => Promise<Group>;
      readonly update?: (command: unknown) => Promise<Group>;
      readonly discardConfirmation?: boolean;
      readonly groupId?: string;
    } = {},
  ) {
    const getGroup = vi.fn(options.get ?? (async () => group()));
    const updateGroup = vi.fn(options.update ?? (async () => group()));
    const navigate = vi.fn().mockResolvedValue(true);
    const params = new BehaviorSubject(
      new Map<string, string>([['groupId', options.groupId ?? '2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e']]),
    );
    const injector = Injector.create({
      providers: [
        { provide: GetGroupQueryService, useValue: { execute: getGroup } },
        { provide: UpdateGroupCommandService, useValue: { execute: updateGroup } },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: params.pipe() },
        },
        { provide: Router, useValue: { navigate } },
        {
          provide: MatDialog,
          useValue: { open: () => ({ afterClosed: () => of(options.discardConfirmation ?? false) }) },
        },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    });
    const page = runInInjectionContext(injector, () => new PermissionsPage()) as unknown as {
      group(): Group | null;
      loading(): boolean;
      loadFailure(): string | null;
      saveFailure(): string | null;
      saving(): boolean;
      pendingChanges(): boolean;
      onPendingChangesChanged(pending: boolean): void;
      save(command: { uuid: string; permissions?: Record<string, boolean> }): Promise<void>;
      cancel(): Promise<void>;
      retry(): void;
    };
    return { page, getGroup, updateGroup, navigate };
  }

  it('reads the role that the route carries', async () => {
    const { page, getGroup } = setup();

    await vi.waitFor(() => expect(page.loading()).toBe(false));

    expect(getGroup).toHaveBeenCalledWith({ uuid: '2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e' });
    expect(page.group()?.name).toBe('Supervisión');
  });

  it('shows the reason of the failure of the read and offers to read it again', async () => {
    const { page, getGroup } = setup({
      get: async () => {
        throw new GroupApiError(503, 'database_unavailable', 'raw backend detail');
      },
    });

    await vi.waitFor(() => expect(page.loading()).toBe(false));

    expect(page.loadFailure()).toContain('El servidor no está disponible');
    expect(page.loadFailure()).not.toContain('raw backend detail');

    page.retry();
    await vi.waitFor(() => expect(getGroup).toHaveBeenCalledTimes(2));
  });

  it('writes the changes of the permissions and returns to the roles', async () => {
    const { page, updateGroup, navigate } = setup();

    await vi.waitFor(() => expect(page.loading()).toBe(false));
    await page.save({ uuid: '2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e', permissions: { manageUsers: true } });

    expect(updateGroup).toHaveBeenCalledWith({
      uuid: '2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e',
      permissions: { manageUsers: true },
    });
    expect(navigate).toHaveBeenCalledWith(['/groups']);
  });

  it('keeps the page open and shows the reason when the platform refuses the change', async () => {
    const { page, navigate } = setup({
      update: async () => {
        throw new GroupApiError(409, 'group_conflict', 'raw backend detail');
      },
    });

    await vi.waitFor(() => expect(page.loading()).toBe(false));
    await page.save({ uuid: '2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e', permissions: { manageUsers: true } });

    expect(page.saveFailure()).toContain('El nombre ya está en uso');
    expect(page.saveFailure()).not.toContain('raw backend detail');
    expect(navigate).not.toHaveBeenCalled();
    expect(page.saving()).toBe(false);
  });

  it('keeps the page open when the changes are not discarded', async () => {
    const { page, navigate } = setup({ discardConfirmation: false });

    await vi.waitFor(() => expect(page.loading()).toBe(false));
    page.onPendingChangesChanged(true);
    await page.cancel();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('returns to the roles when the changes are discarded', async () => {
    const { page, navigate } = setup({ discardConfirmation: true });

    await vi.waitFor(() => expect(page.loading()).toBe(false));
    page.onPendingChangesChanged(true);
    await page.cancel();

    expect(navigate).toHaveBeenCalledWith(['/groups']);
  });
});
