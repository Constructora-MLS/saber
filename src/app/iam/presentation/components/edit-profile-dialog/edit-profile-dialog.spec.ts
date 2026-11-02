import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { describe, expect, it, vi } from 'vitest';
import { UpdateProfileCommandService } from '../../../application/command-services/user-command-services';
import { PlatformUser } from '../../../domain/model/aggregates/platform-user';
import { restoreEmail } from '../../../domain/model/value-objects/email';
import { UserId } from '../../../domain/model/value-objects/user-id';
import { EditProfileDialog } from './edit-profile-dialog';

function account(firstName: string, lastName: string): PlatformUser {
  return PlatformUser.restore(
    UserId.restore('the-user'),
    restoreEmail('admin@akame.local'),
    firstName,
    lastName,
    'active',
  );
}

describe('EditProfileDialog', () => {
  function setup(
    execute: (command: { firstName: string; lastName: string }) => Promise<PlatformUser>,
  ) {
    const close = vi.fn();
    const injector = Injector.create({
      providers: [
        { provide: FormBuilder, useValue: new FormBuilder() },
        { provide: UpdateProfileCommandService, useValue: { execute } },
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { firstName: 'Admin', lastName: 'Akame' },
        },
      ],
    });
    const dialog = runInInjectionContext(injector, () => new EditProfileDialog()) as unknown as {
      form: FormGroup<{ firstName: FormControl<string>; lastName: FormControl<string> }>;
      submit(): Promise<void>;
      cancel(): void;
      errorMessage(): string | null;
      submitting(): boolean;
    };
    return { dialog, close };
  }

  it('edita el nombre y el apellido que la plataforma publicó', async () => {
    const execute = vi.fn().mockResolvedValue(account('Administradora', 'Akame'));
    const { dialog, close } = setup(execute);

    expect(dialog.form.getRawValue()).toEqual({ firstName: 'Admin', lastName: 'Akame' });

    await dialog.submit();

    expect(execute).toHaveBeenCalledWith({ firstName: 'Admin', lastName: 'Akame' });
    expect(close).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Administradora' }));
  });

  it('no guarda un nombre vacío', async () => {
    const execute = vi.fn().mockResolvedValue(account('', ''));
    const { dialog, close } = setup(execute);

    dialog.form.controls.firstName.setValue('   ');
    dialog.form.controls.lastName.setValue('');
    await dialog.submit();

    expect(execute).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(dialog.errorMessage()).toBeNull();
  });

  it('muestra el motivo del rechazo de la plataforma', async () => {
    const execute = vi.fn().mockRejectedValue(new Error('the platform is down'));
    const { dialog, close } = setup(execute);

    await dialog.submit();

    expect(close).not.toHaveBeenCalled();
    expect(dialog.errorMessage()).toBe('No se pudo guardar el nombre.');
    expect(dialog.submitting()).toBe(false);
  });

  it('cierra el diálogo sin cambiar nada cuando el usuario cancela', () => {
    const { dialog, close } = setup(vi.fn());

    dialog.cancel();

    expect(close).toHaveBeenCalledWith(undefined);
  });
});
