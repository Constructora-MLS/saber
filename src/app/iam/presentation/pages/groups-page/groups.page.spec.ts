import '@angular/compiler';
import { DestroyRef, Injector, runInInjectionContext } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import {
  AssignGroupMemberCommandService,
  DeleteGroupCommandService,
  RemoveGroupMemberCommandService,
  ReorderGroupsCommandService,
  UpdateGroupCommandService,
} from '../../../application/command-services/group-command-services';
import {
  GetGroupQueryService,
  ListGroupMembersQueryService,
  ListGroupsQueryService,
} from '../../../application/query-services/group-query-services';
import { Group } from '../../../domain/model/aggregates/group';
import { GroupApiError } from '../../../infrastructure/errors/group-api.error';
import { GroupId } from '../../../domain/model/value-objects/group-id';
import { GroupName } from '../../../domain/model/value-objects/group-name';
import { GroupColor } from '../../../domain/model/value-objects/group-color';
import { GroupMember } from '../../../domain/model/value-objects/group-member';
import { GroupPriority } from '../../../domain/model/value-objects/group-priority';
import { restoreGroupStatus } from '../../../domain/model/value-objects/group-status';
import { restoreEmail } from '../../../domain/model/value-objects/email';
import { UserId } from '../../../domain/model/value-objects/user-id';
import { CreateGroupDialog } from '../../components/create-group-dialog/create-group-dialog';
import { GroupRow } from '../../components/group-table/group-table';
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

function row(id: string, name: string): GroupRow {
  return { id, name, color: '#13579B' };
}

function member(id: string, name: string, owner = false): GroupMember {
  return GroupMember.restore({
    id: UserId.restore(id),
    email: restoreEmail('persona@empresa.pe'),
    firstName: name,
    lastName: '',
    userType: owner ? 'owner' : 'member',
  });
}

function pageWith(
  options: {
    readonly list?: (query: {
      search?: string;
      limit?: number;
      page?: number;
    }) => Promise<ReturnType<typeof listing>>;
    readonly get?: (query: { uuid: string }) => Promise<Group>;
    readonly listMembers?: (query: {
      uuid: string;
      limit?: number;
      page?: number;
    }) => Promise<{
      items: readonly GroupMember[];
      page: number;
      totalPages: number;
      total: number;
    }>;
    readonly update?: (command: unknown) => Promise<Group>;
    readonly assign?: (command: { userId: string; groupId: string }) => Promise<void>;
    readonly remove?: (command: { userId: string; groupId: string }) => Promise<void>;
    readonly delete?: (command: unknown) => Promise<void>;
    readonly reorder?: (command: { groupIds: readonly string[] }) => Promise<void>;
    readonly discardConfirmation?: boolean;
    readonly createdGroup?: Group;
  } = {},
) {
  const listGroups = vi.fn(options.list ?? (async () => listing([])));
  const getGroup = vi.fn(options.get ?? (async () => first));
  const listMembers = vi.fn(
    options.listMembers ??
      (async () => ({ items: [], page: 1, totalPages: 0, total: 0 })),
  );
  const updateGroup = vi.fn(options.update ?? (async () => first));
  const assignMember = vi.fn(options.assign ?? (async () => undefined));
  const removeMember = vi.fn(options.remove ?? (async () => undefined));
  const deleteGroup = vi.fn(options.delete ?? (async () => undefined));
  const reorderGroups = vi.fn(options.reorder ?? (async () => undefined));
  const open = vi.fn((component: unknown) => ({
    afterClosed: () =>
      of(
        component === CreateGroupDialog
          ? options.createdGroup
          : (options.discardConfirmation ?? false),
      ),
  }));
  const injector = Injector.create({
    providers: [
      { provide: ListGroupsQueryService, useValue: { execute: listGroups } },
      { provide: GetGroupQueryService, useValue: { execute: getGroup } },
      { provide: ListGroupMembersQueryService, useValue: { execute: listMembers } },
      { provide: UpdateGroupCommandService, useValue: { execute: updateGroup } },
      { provide: AssignGroupMemberCommandService, useValue: { execute: assignMember } },
      { provide: RemoveGroupMemberCommandService, useValue: { execute: removeMember } },
      { provide: DeleteGroupCommandService, useValue: { execute: deleteGroup } },
      { provide: ReorderGroupsCommandService, useValue: { execute: reorderGroups } },
      { provide: MatDialog, useValue: { open } },
      { provide: MatSnackBar, useValue: { open: vi.fn() } },
      { provide: DestroyRef, useValue: { onDestroy: () => undefined } },
    ],
  });
  const page = runInInjectionContext(injector, () => new GroupsPage()) as unknown as {
    loadGroups(): Promise<void>;
    onSearchChanged(value: string): void;
    clearSearch(): void;
    openCreateGroup(): void;
    onReorder(ids: readonly string[]): Promise<void>;
    openRole(row: GroupRow): Promise<void>;
    requestClosePanel(): Promise<void>;
    saveRole(command: unknown): Promise<void>;
    removeMember(member: GroupRow & { owner: boolean }): Promise<void>;
    groups(): readonly Group[];
    rows(): readonly GroupRow[];
    loading(): boolean;
    loadFailure(): { title: string; message: string } | null;
    canReorder(): boolean;
    actionFailure(): { title: string; message: string } | null;
    requestDeleteGroup(row: GroupRow): Promise<void>;
    deleteGroup(group: Group): Promise<void>;
    deletingId(): string | null;
    selectedGroup(): Group | null;
    members(): readonly { id: string; name: string; email: string; owner: boolean }[];
    membersFailure(): string | null;
    saveFailure(): string | null;
    saving(): boolean;
    onPendingChangesChanged(pending: boolean): void;
  };
  return { page, listGroups, reorderGroups, deleteGroup, open, listMembers, removeMember };
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
      await page.onReorder([second.id, first.id]);
      expect(reorderGroups).not.toHaveBeenCalled();

      page.clearSearch();
      await vi.waitFor(() => expect(listGroups).toHaveBeenCalledTimes(3));
      await page.onReorder([second.id, first.id]);

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

  it('opens the dialog that registers a group', () => {
    const { page, open } = pageWith();

    page.openCreateGroup();

    expect(open).toHaveBeenCalledWith(CreateGroupDialog, expect.anything());
  });

  it('refreshes the listing when the dialog registers a group', async () => {
    const { page, listGroups } = pageWith({
      list: async () => listing([first]),
      createdGroup: first,
    });

    await page.loadGroups();
    page.openCreateGroup();

    expect(listGroups).toHaveBeenCalledTimes(2);
    expect(page.groups().map((item) => item.id)).toEqual([first.id]);
  });

  it('keeps the listing untouched when the dialog is dismissed', async () => {
    const { page, listGroups } = pageWith({ list: async () => listing([first]) });

    await page.loadGroups();
    page.openCreateGroup();

    expect(listGroups).toHaveBeenCalledTimes(1);
  });

  it('opens the panel of a role with its members', async () => {
    const { page, listMembers } = pageWith({
      list: async () => listing([first]),
      listMembers: async () => ({
        items: [member('7a1b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e', 'Ana')],
        page: 1,
        totalPages: 1,
        total: 1,
      }),
    });

    await page.loadGroups();
    await page.openRole(row(first.id, first.name));

    expect(listMembers).toHaveBeenCalledWith({ uuid: first.id, limit: 20, page: 1 });
    expect(page.selectedGroup()?.name).toBe('Administración');
    expect(page.members()).toEqual([
      { id: '7a1b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e', name: 'Ana', email: 'persona@empresa.pe', owner: false },
    ]);
  });

  it('removes a member of the role and reads the members again', async () => {
    const { page, removeMember, listMembers } = pageWith({
      list: async () => listing([first]),
      listMembers: async () => ({
        items: [member('7a1b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e', 'Ana')],
        page: 1,
        totalPages: 1,
        total: 1,
      }),
    });

    await page.loadGroups();
    await page.openRole(row(first.id, first.name));
    await page.removeMember({
      id: '7a1b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e',
      name: 'Ana',
      email: 'persona@empresa.pe',
      owner: false,
    });

    expect(removeMember).toHaveBeenCalledWith({
      userId: '7a1b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e',
      groupId: first.id,
    });
    expect(listMembers).toHaveBeenCalledTimes(2);
  });

  it('does not remove the owner of the platform from the role', async () => {
    const { page, removeMember } = pageWith({ list: async () => listing([first]) });

    await page.loadGroups();
    await page.openRole(row(first.id, first.name));
    await page.removeMember({
      id: '7a1b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e',
      name: 'Propietario',
      email: 'dueno@empresa.pe',
      owner: true,
    });

    expect(removeMember).not.toHaveBeenCalled();
  });

  it('keeps the panel open when the changes are not discarded', async () => {
    const { page } = pageWith({ list: async () => listing([first]), discardConfirmation: false });

    await page.loadGroups();
    await page.openRole(row(first.id, first.name));
    page.onPendingChangesChanged(true);
    await page.requestClosePanel();

    expect(page.selectedGroup()).not.toBeNull();
  });

  it('shows the roles of the hierarchy in the table', async () => {
    const { page } = pageWith({ list: async () => listing([first, second]) });

    await page.loadGroups();

    expect(page.rows()).toEqual([
      { id: first.id, name: 'Administración', color: '#13579B' },
      { id: second.id, name: 'Personal', color: '#13579B' },
    ]);
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

  it('sends the complete list in priority order and renumbers it after the drag', async () => {
    const { page, reorderGroups } = pageWith({ list: async () => listing([first, second]) });

    await page.loadGroups();
    await page.onReorder([second.id, first.id]);

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
    await page.onReorder([second.id, first.id]);

    expect(list).toHaveBeenCalledTimes(2);
    expect(page.groups().map((item) => item.id)).toEqual([second.id, first.id]);
    expect(page.actionFailure()?.message).toContain('Se actualizó la lista');
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
      delete: () => removal,
    });

    await page.loadGroups();
    const deletion = page.deleteGroup(first);

    expect(page.deletingId()).toBe(first.id);
    expect(page.canReorder()).toBe(false);
    await page.onReorder([second.id, first.id]);
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
    const { page } = pageWith({ list, delete: () => removal });

    await page.loadGroups();
    const deletion = page.deleteGroup(first);
    await page.loadGroups();

    expect(list).toHaveBeenCalledTimes(1);

    failDelete(new Error('network failure'));
    await deletion;

    expect(list).toHaveBeenCalledTimes(2);
    expect(page.groups().map((item) => item.id)).toEqual([first.id, second.id]);
  });

  it('focuses the hierarchy heading after deleting a group and reloading', async () => {
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
    const { page } = pageWith({ list, delete: () => removal });
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
    const { page } = pageWith({ list, delete: () => removal });

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
