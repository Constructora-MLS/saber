import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { describe, expect, it, vi } from 'vitest';
import { ForgotPasswordCommandService } from '../../../application/command-services/auth-command-services';
import { AuthValidationError } from '../../../domain/model/errors/auth-errors';
import { RequestPasswordRecoveryDialog } from './request-password-recovery-dialog';

describe('RequestPasswordRecoveryDialog', () => {
  function setup(
    execute: (command: { email: string }) => Promise<void> = async () => {},
    email = 'admin@akame.local',
  ) {
    const close = vi.fn();
    const injector = Injector.create({
      providers: [
        { provide: ForgotPasswordCommandService, useValue: { execute } },
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: { email } },
      ],
    });
    const dialog = runInInjectionContext(
      injector,
      () => new RequestPasswordRecoveryDialog(),
    ) as unknown as {
      account: { email: string };
      confirm(): Promise<void>;
      cancel(): void;
      errorMessage(): string | null;
      sending(): boolean;
    };
    return { dialog, close };
  }

  it('muestra la dirección de la cuenta en la confirmación', () => {
    const { dialog } = setup();

    expect(dialog.account.email).toBe('admin@akame.local');
  });

  it('pide el enlace con la dirección de la cuenta cuando el miembro confirma', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const { dialog } = setup(execute);

    await dialog.confirm();

    expect(execute).toHaveBeenCalledWith({ email: 'admin@akame.local' });
  });

  it('no pide el enlace cuando el miembro cancela', () => {
    const execute = vi.fn();
    const { dialog, close } = setup(execute);

    dialog.cancel();

    expect(execute).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledWith(false);
  });

  it('no pide el enlace dos veces mientras la petición está en marcha', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const { dialog } = setup(execute);

    await Promise.all([dialog.confirm(), dialog.confirm()]);

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('cierra el diálogo con la confirmación cuando la plataforma responde', async () => {
    const { dialog, close } = setup();

    await dialog.confirm();

    expect(close).toHaveBeenCalledWith(true);
  });

  it('muestra el fallo dentro del diálogo y no lo cierra cuando la plataforma falla', async () => {
    const { dialog, close } = setup(async () => {
      throw new Error('the platform is down');
    });

    await dialog.confirm();

    expect(dialog.errorMessage()).toBe('No se pudo completar la operación. Inténtalo nuevamente.');
    expect(close).not.toHaveBeenCalled();
  });

  it('muestra la razón del dominio cuando la dirección de la cuenta no es válida', async () => {
    const { dialog, close } = setup(async () => {
      throw new AuthValidationError('email', 'El correo electrónico no es válido.');
    });

    await dialog.confirm();

    expect(dialog.errorMessage()).toBe('El correo electrónico no es válido.');
    expect(close).not.toHaveBeenCalled();
  });
});
