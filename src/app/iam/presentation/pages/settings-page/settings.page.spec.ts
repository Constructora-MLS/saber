import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionStore } from '../../../application/session/auth-session.store';
import { PlatformUser } from '../../../domain/model/aggregates/platform-user';
import { restoreEmail } from '../../../domain/model/value-objects/email';
import { UserId } from '../../../domain/model/value-objects/user-id';
import { RequestPasswordRecoveryDialog } from '../../components/request-password-recovery-dialog/request-password-recovery-dialog';
import { SettingsPage } from './settings.page';

class Page extends SettingsPage {
  get name() {
    return this.userName();
  }
  get email() {
    return this.userEmail();
  }
  get busy() {
    return this.closing();
  }
  close() {
    return this.logout();
  }
  back() {
    return this.goBack();
  }
  edit() {
    return this.openProfileDialog();
  }
  change() {
    return this.changePassword();
  }
}

describe('SettingsPage', () => {
  function setup(
    logout: () => Promise<void> = async () => {},
    answered: PlatformUser | undefined = undefined,
    options: { confirmed?: boolean; authenticated?: boolean } = {},
  ) {
    const navigateByUrl = vi.fn().mockResolvedValue(true);
    const notify = vi.fn();
    const back = vi.fn();
    const applyProfile = vi.fn();
    const confirmed = options.confirmed ?? true;
    const open = vi.fn((dialog: unknown) => ({
      afterClosed: () => ({
        subscribe: (next: (value: unknown) => void) =>
          next(dialog === RequestPasswordRecoveryDialog ? confirmed : answered),
      }),
    }));
    const injector = Injector.create({
      providers: [
        {
          provide: AuthSessionStore,
          useValue: {
            logout,
            applyProfile,
            identity: () =>
              options.authenticated === false
                ? null
                : {
                    uuid: 'the-user',
                    email: 'admin@akame.local',
                    firstName: 'Admin',
                    lastName: 'Akame',
                  },
          },
        },
        { provide: Router, useValue: { navigateByUrl } },
        { provide: Location, useValue: { back } },
        { provide: MatSnackBar, useValue: { open: notify } },
        { provide: MatDialog, useValue: { open } },
      ],
    });
    const page = runInInjectionContext(injector, () => new Page());
    return { page, navigateByUrl, notify, back, applyProfile, open };
  }

  it('muestra el nombre y el correo del usuario autenticado', () => {
    const { page } = setup();

    expect(page.name).toBe('Admin Akame');
    expect(page.email).toBe('admin@akame.local');
  });

  it('vuelve a la página anterior', () => {
    const { page, back } = setup();

    page.back();

    expect(back).toHaveBeenCalled();
  });

  it('cierra la sesión y vuelve al sign in', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    const { page, navigateByUrl } = setup(logout);

    await page.close();

    expect(logout).toHaveBeenCalled();
    expect(navigateByUrl).toHaveBeenCalledWith('/sign-in');
    expect(page.busy).toBe(false);
  });

  it('avisa con la notificación de Material cuando la plataforma no cierra la sesión', async () => {
    const { page, notify } = setup(async () => {
      throw new Error('the platform is down');
    });

    await page.close();

    expect(notify).toHaveBeenCalledWith(
      'No se pudo cerrar la sesión. Inténtalo nuevamente.',
      'Cerrar',
      { duration: 4000 },
    );
  });

  it('no cierra la sesión dos veces', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    const { page } = setup(logout);

    await Promise.all([page.close(), page.close()]);

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('abre el diálogo de edición con los nombres que la plataforma publicó', () => {
    const { page, open } = setup();

    page.edit();

    expect(open).toHaveBeenCalledWith(expect.anything(), {
      data: { firstName: 'Admin', lastName: 'Akame' },
      width: '30rem',
      maxWidth: '94vw',
    });
  });

  it('guarda el nombre editado en la sesión y avisa del cambio', () => {
    const edited = PlatformUser.restore(
      UserId.restore('the-user'),
      restoreEmail('admin@akame.local'),
      'Administradora',
      'Akame',
      'active',
    );
    const { page, applyProfile, notify } = setup(async () => {}, edited);

    page.edit();

    expect(applyProfile).toHaveBeenCalledWith(edited);
    expect(notify).toHaveBeenCalledWith('Nombre actualizado.', 'Cerrar', { duration: 4000 });
  });

  it('no cambia la sesión cuando el usuario cancela la edición', () => {
    const { page, applyProfile, notify } = setup(async () => {}, undefined);

    page.edit();

    expect(applyProfile).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('abre el diálogo de restablecimiento con la dirección de la cuenta', () => {
    const { page, open } = setup();

    page.change();

    expect(open).toHaveBeenCalledWith(RequestPasswordRecoveryDialog, {
      data: { email: 'admin@akame.local' },
      autoFocus: 'first-heading',
      width: '30rem',
      maxWidth: '94vw',
    });
  });

  it('no lleva al usuario a la recuperación de la contraseña', () => {
    const { page, navigateByUrl } = setup();

    page.change();

    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('avisa del envío del enlace cuando el diálogo confirma', () => {
    const { page, notify } = setup();

    page.change();

    expect(notify).toHaveBeenCalledWith(
      'Si el correo corresponde a una cuenta activa, recibirás un enlace para restablecer tu contraseña en admin@akame.local.',
      'Cerrar',
      { duration: 4000 },
    );
  });

  it('no avisa del envío del enlace cuando el miembro cancela el diálogo', () => {
    const { page, notify } = setup(async () => {}, undefined, { confirmed: false });

    page.change();

    expect(notify).not.toHaveBeenCalled();
  });

  it('no abre el diálogo de restablecimiento cuando la sesión no tiene identidad', () => {
    const { page, open } = setup(async () => {}, undefined, { authenticated: false });

    page.change();

    expect(open).not.toHaveBeenCalled();
  });
});
