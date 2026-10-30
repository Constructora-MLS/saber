import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionStore } from '../../../application/session/auth-session.store';
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
}

describe('SettingsPage', () => {
  function setup(logout: () => Promise<void> = async () => {}) {
    const navigateByUrl = vi.fn().mockResolvedValue(true);
    const notify = vi.fn();
    const injector = Injector.create({
      providers: [
        {
          provide: AuthSessionStore,
          useValue: {
            logout,
            identity: () => ({
              uuid: 'the-user',
              email: 'admin@akame.local',
              firstName: 'Admin',
              lastName: 'Akame',
            }),
          },
        },
        { provide: Router, useValue: { navigateByUrl } },
        { provide: MatSnackBar, useValue: { open: notify } },
      ],
    });
    const page = runInInjectionContext(injector, () => new Page());
    return { page, navigateByUrl, notify };
  }

  it('muestra el nombre y el correo del usuario autenticado', () => {
    const { page } = setup();

    expect(page.name).toBe('Admin Akame');
    expect(page.email).toBe('admin@akame.local');
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
});
