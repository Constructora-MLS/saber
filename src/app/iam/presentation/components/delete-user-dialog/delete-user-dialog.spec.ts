import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { describe, expect, it, vi } from 'vitest';
import {
  CancelInvitationCommandService,
  DeleteUserCommandService,
} from '../../../application/command-services/user-command-services';
import { DeleteUserDialog } from './delete-user-dialog';

const accountId = '2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e';

describe('DeleteUserDialog', () => {
  function setup(status: 'active' | 'pending') {
    const close = vi.fn();
    const deleteUser = vi.fn().mockResolvedValue(undefined);
    const cancelInvitation = vi.fn().mockResolvedValue(undefined);
    const injector = Injector.create({
      providers: [
        { provide: DeleteUserCommandService, useValue: { execute: deleteUser } },
        { provide: CancelInvitationCommandService, useValue: { execute: cancelInvitation } },
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            id: accountId,
            name: 'Mina Kato',
            email: 'mina@example.test',
            status,
          },
        },
      ],
    });
    const dialog = runInInjectionContext(injector, () => new DeleteUserDialog()) as unknown as {
      confirm(): Promise<void>;
      onConfirmationChanged(event: Event): void;
      title(): string;
      description(): string;
      warning(): string;
      confirmation(): string;
      action(): string;
    };
    return { dialog, close, deleteUser, cancelInvitation };
  }

  function confirmOf(dialog: { onConfirmationChanged(event: Event): void }): void {
    dialog.onConfirmationChanged({ target: { checked: true } } as unknown as Event);
  }

  it('deletes an active member through the deletion of the account', async () => {
    const { dialog, close, deleteUser, cancelInvitation } = setup('active');

    confirmOf(dialog);
    await dialog.confirm();

    expect(deleteUser).toHaveBeenCalledWith({ id: accountId });
    expect(cancelInvitation).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledWith(true);
  });

  it('cancels the invitation of a pending account instead of deleting it', async () => {
    const { dialog, close, deleteUser, cancelInvitation } = setup('pending');

    confirmOf(dialog);
    await dialog.confirm();

    expect(cancelInvitation).toHaveBeenCalledWith({ id: accountId });
    expect(deleteUser).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledWith(true);
  });

  it('tells the administrator that the pending account survives the cancellation', () => {
    const { dialog } = setup('pending');

    expect(dialog.title()).toBe('Cancelar invitación');
    expect(dialog.action()).toBe('Cancelar invitación');
    expect(dialog.warning()).toContain('la cuenta pendiente se conserva');
    expect(dialog.confirmation()).toContain('conservar la cuenta pendiente');
  });

  it('does not promise a deletion of the pending account', () => {
    const { dialog } = setup('pending');

    expect(dialog.warning()).not.toContain('deshabilitada');
    expect(dialog.confirmation()).not.toContain('deshabilitar');
  });

  it('keeps the dialog open when the platform refuses the operation', async () => {
    const { dialog, close, deleteUser } = setup('active');
    deleteUser.mockRejectedValue(new Error('the platform refused the deletion'));

    confirmOf(dialog);
    await dialog.confirm();

    expect(close).not.toHaveBeenCalled();
  });

  it('does nothing when the administrator did not confirm the consequence', async () => {
    const { dialog, close, deleteUser } = setup('active');

    await dialog.confirm();

    expect(deleteUser).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });
});
