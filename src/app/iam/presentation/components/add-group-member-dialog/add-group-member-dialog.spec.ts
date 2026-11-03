import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { describe, expect, it, vi } from 'vitest';
import { AssignGroupMemberCommandService } from '../../../application/command-services/group-command-services';
import { ListUsersQueryService } from '../../../application/query-services/user-query-services';
import { PlatformUser } from '../../../domain/model/aggregates/platform-user';
import { restoreEmail } from '../../../domain/model/value-objects/email';
import { UserId } from '../../../domain/model/value-objects/user-id';
import { AddGroupMemberDialog } from './add-group-member-dialog';

const groupId = '2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e';
const userId = '7a1b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e';
const otherUserId = '7a1b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5f';

function account(
  status: 'active' | 'pending' = 'active',
  userType: 'owner' | 'member' = 'member',
): PlatformUser {
  return PlatformUser.restore(
    UserId.restore(userId),
    restoreEmail('ana@akame.local'),
    'Ana',
    'Quispe',
    status,
    userType,
  );
}

describe('AddGroupMemberDialog', () => {
  function setup(
    options: {
      readonly list?: (query: unknown) => Promise<unknown>;
      readonly memberIds?: readonly string[];
    } = {},
  ) {
    const close = vi.fn();
    const listUsers = vi.fn(
      options.list ??
        (async () => ({ items: [account()], page: 1, totalPages: 1, total: 1 })),
    );
    const assignMember = vi.fn().mockResolvedValue(undefined);
    const injector = Injector.create({
      providers: [
        { provide: FormBuilder, useValue: new FormBuilder() },
        { provide: ListUsersQueryService, useValue: { execute: listUsers } },
        { provide: AssignGroupMemberCommandService, useValue: { execute: assignMember } },
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { groupId, groupName: 'Supervisión', memberIds: options.memberIds ?? [] },
        },
      ],
    });
    const dialog = runInInjectionContext(injector, () => new AddGroupMemberDialog()) as unknown as {
      ngOnInit(): void;
      search(): Promise<void>;
      add(): Promise<void>;
      cancel(): void;
      toggle(id: string): void;
      onSearchChanged(term: string): void;
      requestPage(page: number): Promise<void>;
      searchTerm(): string;
      accounts(): readonly PlatformUser[];
      selected(): readonly string[];
      page(): number;
      totalPages(): number;
      errorMessage(): string | null;
      canJoin(account: PlatformUser): boolean;
      refusal(account: PlatformUser): string | null;
      isMember(id: string): boolean;
      isSelected(id: string): boolean;
    };
    return { dialog, close, listUsers, assignMember };
  }

  it('shows the accounts of the organization when it opens', async () => {
    const { dialog, listUsers } = setup();

    dialog.ngOnInit();
    await vi.waitFor(() => expect(dialog.accounts()).toHaveLength(1));

    expect(listUsers).toHaveBeenCalledWith({ limit: 20, page: 1 });
  });

  it('asks the platform for the accounts that match the term', async () => {
    const { dialog, listUsers } = setup();

    dialog.ngOnInit();
    await vi.waitFor(() => expect(dialog.accounts()).toHaveLength(1));

    dialog.onSearchChanged('Ana');
    await dialog.search();

    expect(listUsers).toHaveBeenLastCalledWith({ search: 'Ana', limit: 20, page: 1 });
  });

  it('asks the platform for another page of the accounts', async () => {
    const { dialog, listUsers } = setup();

    dialog.ngOnInit();
    await vi.waitFor(() => expect(dialog.accounts()).toHaveLength(1));

    await dialog.requestPage(3);

    expect(listUsers).toHaveBeenLastCalledWith({ limit: 20, page: 3 });
  });

  it('assigns the chosen accounts to the role', async () => {
    const { dialog, close, assignMember } = setup();

    dialog.toggle(userId);
    await dialog.add();

    expect(assignMember).toHaveBeenCalledWith({ userId, groupId });
    expect(close).toHaveBeenCalledWith(true);
  });

  it('assigns every chosen account of the list', async () => {
    const { dialog, close, assignMember } = setup();

    dialog.toggle(userId);
    dialog.toggle(otherUserId);
    await dialog.add();

    expect(assignMember).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledWith(true);
  });

  it('does not assign anything when no account is chosen', async () => {
    const { dialog, close, assignMember } = setup();

    await dialog.add();

    expect(assignMember).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('keeps the dialog open when the platform refuses the membership', async () => {
    const { dialog, close, assignMember } = setup();
    assignMember.mockRejectedValue(new Error('the platform refused the membership'));

    dialog.toggle(userId);
    await dialog.add();

    expect(close).not.toHaveBeenCalled();
    expect(dialog.errorMessage()).not.toBeNull();
  });

  it('closes the dialog without adding anybody', () => {
    const { dialog, close } = setup();

    dialog.cancel();

    expect(close).toHaveBeenCalledWith(false);
  });

  it('does not let the administrator choose an account that already belongs to the role', () => {
    const { dialog } = setup({ memberIds: [userId] });

    expect(dialog.isMember(userId)).toBe(true);
    expect(dialog.isSelected(userId)).toBe(false);
  });

  it('hides the owner of the platform from the accounts that can join a role', async () => {
    const { dialog } = setup({
      list: async () => ({
        items: [account('active', 'owner'), account()],
        page: 1,
        totalPages: 1,
        total: 2,
      }),
    });

    dialog.ngOnInit();
    await vi.waitFor(() => expect(dialog.accounts()).toHaveLength(1));

    expect(dialog.accounts()[0]?.userType).toBe('member');
  });

  it('does not offer to add an account that never accepted its invitation', () => {
    const { dialog } = setup();

    expect(dialog.canJoin(account('pending'))).toBe(false);
    expect(dialog.refusal(account('pending'))).toContain('invitación');
  });

  it('offers to add an active account of a member', () => {
    const { dialog } = setup();

    expect(dialog.canJoin(account())).toBe(true);
    expect(dialog.refusal(account())).toBeNull();
  });
});
