import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { describe, expect, it, vi } from 'vitest';
import { DeleteGroupDialog } from './delete-group-dialog';

describe('DeleteGroupDialog', () => {
  it('returns the deletion intention when the group is deleted', () => {
    const close = vi.fn();
    const injector = Injector.create({
      providers: [
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: { name: 'Supervisión' } },
      ],
    });
    const dialog = runInInjectionContext(injector, () => new DeleteGroupDialog()) as unknown as {
      confirm(): void;
      cancel(): void;
    };

    dialog.confirm();

    expect(close).toHaveBeenCalledWith(true);
  });

  it('closes the dialog without deleting the group when it is cancelled', () => {
    const close = vi.fn();
    const injector = Injector.create({
      providers: [
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: { name: 'Supervisión' } },
      ],
    });
    const dialog = runInInjectionContext(injector, () => new DeleteGroupDialog()) as unknown as {
      confirm(): void;
      cancel(): void;
    };

    dialog.cancel();

    expect(close).toHaveBeenCalledWith(false);
  });
});
