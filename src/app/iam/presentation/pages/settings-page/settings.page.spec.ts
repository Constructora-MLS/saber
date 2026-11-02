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
}

describe('SettingsPage', () => {
  function setup(
    logout: () => Promise<void> = async () => {},
    answered: PlatformUser | undefined = undefined,
  ) {
    const navigateByUrl = vi.fn().mockResolvedValue(true);
    const notify = vi.fn();
    const back = vi.fn();
    const applyProfile = vi.fn();
    const open = vi.fn().mockReturnValue({
      afterClosed: () => ({
        subscribe: (next: (user: PlatformUser | undefined) => void) => next(answered),
      }),
    });
    const injector = Injector.create({
      providers: [
        {
          provide: AuthSessionStore,
          useValue: {
            logout,
            applyProfile,
            identity: () => ({
              uuid: 'the-user',
              email: 'admin@akame.local',
              firstName: 'Admin',
              lastName: 'Akame',
            }),
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
});
