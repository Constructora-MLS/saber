import '@angular/compiler';
import { DestroyRef, Injector, runInInjectionContext } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import {
  CreateGroupCommandService,
  DeleteGroupCommandService,
  ReorderGroupsCommandService,
  UpdateGroupCommandService,
} from '../../../application/command-services/group-command-services';
import { CreateGroupCommand } from '../../../application/commands/group-commands';
import {
  GetGroupQueryService,
  ListGroupsQueryService,
} from '../../../application/query-services/group-query-services';
import { Group } from '../../../domain/model/aggregates/group';
import { GroupApiError } from '../../../infrastructure/errors/group-api.error';
import { GroupId } from '../../../domain/model/value-objects/group-id';
import { GroupName } from '../../../domain/model/value-objects/group-name';
import { GroupColor } from '../../../domain/model/value-objects/group-color';
import { GroupPriority } from '../../../domain/model/value-objects/group-priority';
import { restoreGroupStatus } from '../../../domain/model/value-objects/group-status';
import { GroupsPage } from './groups.page';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const permissions = {
  manageEmployees: false,
  manageAssignments: false,
  manageCatalog: false,
  manageCertificates: false,
  manageUsers: false,
  managePermissionsGroups: false,
  administrator: false,
};

function group(id: string, name: string, priority: number): Group {
  return Group.restore({
    id: GroupId.restore(id),
    name: GroupName.restore(name),
    color: GroupColor.restore('#13579B'),
    priority: GroupPriority.restore(priority),
    permissions,
    status: restoreGroupStatus('active'),
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  });
}

function listing(items: readonly Group[], total = items.length) {
  return { items, page: 1, totalPages: total > 0 ? 1 : 0, total };
}

function pageWith(
  options: {
    readonly list?: (query: {
      search?: string;
      limit?: number;
      page?: number;
    }) => Promise<ReturnType<typeof listing>>;
    readonly create?: (command: CreateGroupCommand) => Promise<Group>;
    readonly get?: (query: { uuid: string }) => Promise<Group>;
    readonly update?: (command: unknown) => Promise<Group>;
    readonly remove?: (command: unknown) => Promise<void>;
    readonly reorder?: (command: { groupIds: readonly string[] }) => Promise<void>;
    readonly discardConfirmation?: boolean;
  } = {},
) {
  const listGroups = vi.fn(options.list ?? (async () => listing([])));
  const createGroup = vi.fn(options.create ?? (async () => first));
  const getGroup = vi.fn(
    options.get ?? (async () => group('4f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e', 'Sin nombre', 1)),
  );
  const updateGroup = vi.fn(
    options.update ?? (async () => group('4f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e', 'Sin nombre', 1)),
  );
  const deleteGroup = vi.fn(options.remove ?? (async () => undefined));
  const reorderGroups = vi.fn(options.reorder ?? (async () => undefined));
  const injector = Injector.create({
    providers: [
      { provide: ListGroupsQueryService, useValue: { execute: listGroups } },
      { provide: CreateGroupCommandService, useValue: { execute: createGroup } },
      { provide: GetGroupQueryService, useValue: { execute: getGroup } },
      { provide: UpdateGroupCommandService, useValue: { execute: updateGroup } },
      { provide: DeleteGroupCommandService, useValue: { execute: deleteGroup } },
      { provide: ReorderGroupsCommandService, useValue: { execute: reorderGroups } },
      {
        provide: MatDialog,
        useValue: { open: () => ({ afterClosed: () => of(options.discardConfirmation ?? false) }) },
      },
      { provide: MatSnackBar, useValue: { open: vi.fn() } },
      { provide: DestroyRef, useValue: { onDestroy: () => undefined } },
    ],
  });
  const page = runInInjectionContext(injector, () => new GroupsPage()) as unknown as {
    loadGroups(): Promise<void>;
    onSearchChanged(value: string): void;
    clearSearch(): void;
    openCreateGroup(event?: Event): Promise<void>;
    createGroup(command: CreateGroupCommand): Promise<void>;
    moveGroup(uuid: string, direction: -1 | 1): Promise<void>;
    groups(): readonly Group[];
    loading(): boolean;
    loadFailure(): { title: string; message: string } | null;
    saveFailure(): string | null;
    editorOpen(): boolean;
    creatingGroup(): boolean;
    canReorder(): boolean;
    actionFailure(): { title: string; message: string } | null;
    selectedGroupId(): string | null;
    openEditor(group: Group): Promise<void>;
    onPendingChangesChanged(pending: boolean): void;
    requestCloseEditor(): Promise<void>;
    deleteGroup(group: Group): Promise<void>;
    deletingId(): string | null;
  };
  return { page, listGroups, createGroup, reorderGroups, deleteGroup };
}

const first = group('2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e', 'Administración', 1);
const second = group('3f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e', 'Personal', 2);

describe('GroupsPage', () => {
  it('keeps the initial listing in loading state until the API responds', async () => {
    const result = deferred<ReturnType<typeof listing>>();
    const { page } = pageWith({ list: () => result.promise });

    expect(page.loading()).toBe(true);
    const pendingLoad = page.loadGroups();
    expect(page.loading()).toBe(true);

    result.resolve(listing([]));
    await pendingLoad;

    expect(page.loading()).toBe(false);
    expect(page.groups()).toEqual([]);
    expect(page.loadFailure()).toBeNull();
  });

  it('debounces search through the API and renders the server result without local filtering', async () => {
    vi.useFakeTimers();
    try {
      const { page, listGroups } = pageWith({
        list: async ({ search }) => (search ? listing([second]) : listing([first, second])),
      });

      await page.loadGroups();
      expect(listGroups).toHaveBeenCalledWith({ limit: 100, page: 1 });
      expect(page.canReorder()).toBe(true);

      page.onSearchChanged('  Personal  ');
      expect(page.groups().map((item) => item.name)).toEqual(['Administración', 'Personal']);
      expect(page.canReorder()).toBe(false);

      await vi.advanceTimersByTimeAsync(300);
      expect(listGroups).toHaveBeenLastCalledWith({ search: 'Personal', limit: 100, page: 1 });
      expect(page.groups().map((item) => item.name)).toEqual(['Personal']);
      expect(page.canReorder()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not let an older search response replace the latest result', async () => {
    vi.useFakeTimers();
    try {
      const firstSearch = deferred<ReturnType<typeof listing>>();
      const secondSearch = deferred<ReturnType<typeof listing>>();
      const list = vi.fn(({ search }: { search?: string }) => {
        if (search === 'Ad') return firstSearch.promise;
        if (search === 'Pe') return secondSearch.promise;
        return Promise.resolve(listing([first, second]));
      });
      const { page, listGroups } = pageWith({ list });

      await page.loadGroups();
      page.onSearchChanged('Ad');
      await vi.advanceTimersByTimeAsync(300);
      expect(listGroups).toHaveBeenCalledTimes(2);

      page.onSearchChanged('Pe');
      firstSearch.resolve(listing([first]));
      await Promise.resolve();
      expect(page.groups().map((item) => item.id)).toEqual([first.id, second.id]);

      await vi.advanceTimersByTimeAsync(300);
      secondSearch.resolve(listing([second]));
      await Promise.resolve();
      expect(page.groups().map((item) => item.id)).toEqual([second.id]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not surface an obsolete search failure after a newer term was entered', async () => {
    vi.useFakeTimers();
    try {
      const obsoleteSearch = deferred<ReturnType<typeof listing>>();
      const list = vi.fn(({ search }: { search?: string }) => {
        if (search === 'Ad') return obsoleteSearch.promise;
        if (search === 'Pe') return Promise.resolve(listing([second]));
        return Promise.resolve(listing([first, second]));
      });
      const { page } = pageWith({ list });

      await page.loadGroups();
      page.onSearchChanged('Ad');
      await vi.advanceTimersByTimeAsync(300);
      page.onSearchChanged('Pe');
      obsoleteSearch.reject(new GroupApiError(503, 'database_unavailable', 'raw backend detail'));
      await Promise.resolve();

      expect(page.loadFailure()).toBeNull();
      await vi.advanceTimersByTimeAsync(300);
      expect(page.groups().map((item) => item.id)).toEqual([second.id]);
      expect(page.loadFailure()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not reorder a filtered response and reloads the full hierarchy before reordering', async () => {
    vi.useFakeTimers();
    try {
      const { page, listGroups, reorderGroups } = pageWith({
        list: async ({ search }) => (search ? listing([second]) : listing([first, second])),
      });

      await page.loadGroups();
      page.onSearchChanged('Personal');
      await vi.advanceTimersByTimeAsync(300);
      await page.moveGroup(second.id, -1);
      expect(reorderGroups).not.toHaveBeenCalled();

      page.clearSearch();
      await vi.waitFor(() => expect(listGroups).toHaveBeenCalledTimes(3));
      await page.moveGroup(second.id, -1);

      expect(reorderGroups).toHaveBeenCalledWith({ groupIds: [second.id, first.id] });
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not query for a search term outside the backend bounds', async () => {
    vi.useFakeTimers();
    try {
      const { page, listGroups } = pageWith();
      await page.loadGroups();

      page.onSearchChanged('x');

      expect(listGroups).toHaveBeenCalledTimes(1);
      expect(page.groups()).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens the integrated create form without adding permission fields', async () => {
    const { page } = pageWith();

    await page.openCreateGroup();

    expect(page.editorOpen()).toBe(true);
    expect(page.creatingGroup()).toBe(true);
  });

  it('creates a group and refreshes the current API listing', async () => {
    const { page, listGroups, createGroup } = pageWith({
      list: async () => listing([first]),
      create: async () => first,
    });

    await page.loadGroups();
    await page.openCreateGroup();
    await page.createGroup({ name: 'Administración', color: '#13579B' });

    expect(createGroup).toHaveBeenCalledWith({ name: 'Administración', color: '#13579B' });
    expect(listGroups).toHaveBeenCalledTimes(2);
    expect(page.editorOpen()).toBe(false);
  });

  it.each([
    [409, 'group_limit_reached', '50 grupos activos'],
    [409, 'group_conflict', 'El nombre ya está en uso'],
    [403, 'forbidden', 'permisos o la jerarquía'],
  ])('shows Spanish creation feedback for status %s / %s', async (status, code, message) => {
    const { page } = pageWith({
      create: async () => {
        throw new GroupApiError(status, code, 'raw backend detail');
      },
    });

    await page.openCreateGroup();
    await page.createGroup({ name: 'Administración', color: '#13579B' });

    expect(page.saveFailure()).toContain(message);
    expect(page.saveFailure()).not.toContain('raw backend detail');
    expect(page.editorOpen()).toBe(true);
  });

  it('reports a listing failure as an explicit state and keeps the failure in Spanish', async () => {
    const { page } = pageWith({
      list: async () => {
        throw new GroupApiError(503, 'database_unavailable', 'raw backend detail');
      },
    });

    await page.loadGroups();

    expect(page.loading()).toBe(false);
    expect(page.loadFailure()?.title).toBe('El servicio de grupos no está disponible');
    expect(page.loadFailure()?.message).not.toContain('raw backend detail');
  });

  it('sends the complete list in priority order and renumbers it after a keyboard move', async () => {
    const { page, reorderGroups } = pageWith({ list: async () => listing([first, second]) });

    await page.loadGroups();
    await page.moveGroup(first.id, 1);

    expect(reorderGroups).toHaveBeenCalledWith({ groupIds: [second.id, first.id] });
    expect(page.groups().map((item) => [item.id, item.priority])).toEqual([
      [second.id, 1],
      [first.id, 2],
    ]);
  });

  it('reloads the hierarchy and reports a conflict instead of retaining a stale order', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce(listing([first, second]))
      .mockResolvedValueOnce(
        listing([group(second.id, 'Personal', 1), group(first.id, 'Administración', 2)]),
      );
    const { page } = pageWith({
      list,
      reorder: async () => {
        throw Object.assign(new Error('backend detail'), {
          status: 409,
          code: 'group_order_conflict',
        });
      },
    });

    await page.loadGroups();
    await page.moveGroup(first.id, 1);

    expect(list).toHaveBeenCalledTimes(2);
    expect(page.groups().map((item) => item.id)).toEqual([second.id, first.id]);
    expect(page.actionFailure()?.message).toContain('Se actualizó la lista');
  });

  it('keeps the editor open when a person rejects discarding pending changes', async () => {
    const { page } = pageWith({ get: async () => first, discardConfirmation: false });

    await page.openEditor(first);
    page.onPendingChangesChanged(true);
    await page.requestCloseEditor();

    expect(page.selectedGroupId()).toBe(first.id);
  });

  it('does not permit reorder when the returned page is incomplete', async () => {
    const { page } = pageWith({ list: async () => listing([first, second], 51) });

    await page.loadGroups();

    expect(page.canReorder()).toBe(false);
  });

  it('does not permit reordering while a group is being deleted', async () => {
    let finishDelete!: () => void;
    const removal = new Promise<void>((resolve) => {
      finishDelete = resolve;
    });
    const { page, reorderGroups } = pageWith({
      list: async () => listing([first, second]),
      remove: () => removal,
    });

    await page.loadGroups();
    const deletion = page.deleteGroup(first);

    expect(page.deletingId()).toBe(first.id);
    expect(page.canReorder()).toBe(false);
    await page.moveGroup(first.id, 1);
    expect(reorderGroups).not.toHaveBeenCalled();

    finishDelete();
    await deletion;
  });

  it('defers list requests made during a deletion until the mutation settles', async () => {
    let failDelete!: (error: Error) => void;
    const removal = new Promise<void>((_, reject) => {
      failDelete = reject;
    });
    const list = vi.fn(async () => listing([first, second]));
    const { page } = pageWith({ list, remove: () => removal });

    await page.loadGroups();
    const deletion = page.deleteGroup(first);
    await page.loadGroups();

    expect(list).toHaveBeenCalledTimes(1);

    failDelete(new Error('network failure'));
    await deletion;

    expect(list).toHaveBeenCalledTimes(2);
    expect(page.groups().map((item) => item.id)).toEqual([first.id, second.id]);
  });

  it('focuses the hierarchy heading after deleting a non-selected group and reloading', async () => {
    let finishDelete!: () => void;
    const removal = new Promise<void>((resolve) => {
      finishDelete = resolve;
    });
    let finishReload!: (value: ReturnType<typeof listing>) => void;
    const reload = new Promise<ReturnType<typeof listing>>((resolve) => {
      finishReload = resolve;
    });
    const list = vi
      .fn()
      .mockResolvedValueOnce(listing([first, second]))
      .mockReturnValueOnce(reload);
    const { page } = pageWith({ list, remove: () => removal });
    const focus = vi.fn();
    Object.defineProperty(page, 'groupsHeading', {
      value: () => ({ nativeElement: { focus } }),
    });

    await page.loadGroups();
    const deletion = page.deleteGroup(first);
    finishDelete();
    await Promise.resolve();

    expect(list).toHaveBeenCalledTimes(2);
    expect(focus).not.toHaveBeenCalled();
    finishReload(listing([second]));
    await deletion;

    expect(page.groups().map((item) => item.id)).toEqual([second.id]);
    expect(focus).toHaveBeenCalledOnce();
  });

  it('does not let a listing started before a deletion overwrite the refreshed hierarchy', async () => {
    let finishStaleLoad!: (value: ReturnType<typeof listing>) => void;
    const staleLoad = new Promise<ReturnType<typeof listing>>((resolve) => {
      finishStaleLoad = resolve;
    });
    let finishDelete!: () => void;
    const removal = new Promise<void>((resolve) => {
      finishDelete = resolve;
    });
    let finishReload!: (value: ReturnType<typeof listing>) => void;
    const reload = new Promise<ReturnType<typeof listing>>((resolve) => {
      finishReload = resolve;
    });
    const list = vi
      .fn()
      .mockResolvedValueOnce(listing([first, second]))
      .mockReturnValueOnce(staleLoad)
      .mockReturnValueOnce(reload);
    const { page } = pageWith({ list, remove: () => removal });

    await page.loadGroups();
    const staleRequest = page.loadGroups();
    const deletion = page.deleteGroup(first);
    finishStaleLoad(
      listing([group(second.id, 'Personal', 1), group(first.id, 'Administración', 2)]),
    );
    await staleRequest;

    expect(page.groups().map((item) => item.id)).toEqual([first.id, second.id]);

    finishDelete();
    await Promise.resolve();
    expect(list).toHaveBeenCalledTimes(3);
    finishReload(listing([second]));
    await deletion;

    expect(page.groups().map((item) => item.id)).toEqual([second.id]);
  });
});
