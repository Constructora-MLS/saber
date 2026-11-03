import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { describe, expect, it, vi } from 'vitest';
import { DeleteGroupDialog } from './delete-group-dialog';

describe('DeleteGroupDialog', () => {
  it('requires explicit confirmation before returning the delete intention', () => {
    const close = vi.fn();
    const injector = Injector.create({
      providers: [
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: { name: 'Supervisión' } },
      ],
    });
    const dialog = runInInjectionContext(injector, () => new DeleteGroupDialog()) as unknown as {
      confirmed(): boolean;
      onConfirmationChanged(event: Event): void;
      confirm(): void;
    };

    dialog.confirm();
    expect(close).not.toHaveBeenCalled();

    dialog.onConfirmationChanged({ target: { checked: true } } as unknown as Event);
    expect(dialog.confirmed()).toBe(true);
    dialog.confirm();

    expect(close).toHaveBeenCalledWith(true);
  });
});
