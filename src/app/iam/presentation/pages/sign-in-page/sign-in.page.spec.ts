import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionStore } from '../../../application/session/auth-session.store';
import { AuthApiError } from '../../../infrastructure/errors/auth-api.error';
import { SignInPage } from './sign-in.page';

class Page extends SignInPage {
  get busy() {
    return this.submitting();
  }
  send(command: { email: string; password: string }) {
    return this.signIn(command);
  }
}

describe('SignInPage', () => {
  function setup(
    options: {
      signIn?: () => Promise<void>;
      authenticated?: boolean;
    } = {},
  ) {
    const signIn = vi.fn(options.signIn ?? (async () => {}));
    const navigateByUrl = vi.fn().mockResolvedValue(true);
    const notify = vi.fn();
    const injector = Injector.create({
      providers: [
        {
          provide: AuthSessionStore,
          useValue: {
            signIn,
            authenticated: () => options.authenticated ?? false,
          },
        },
        { provide: Router, useValue: { navigateByUrl } },
        { provide: MatSnackBar, useValue: { open: notify } },
      ],
    });
    const page = runInInjectionContext(injector, () => new Page());
    return { page, signIn, navigateByUrl, notify };
  }

  it('abre la sesión con las credenciales del formulario', async () => {
    const { page, signIn, navigateByUrl } = setup();

    await page.send({ email: 'admin@akame.local', password: 'the-password' });

    expect(signIn).toHaveBeenCalledWith({
      email: 'admin@akame.local',
      password: 'the-password',
    });
    expect(navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('avisa con la notificación de Material cuando las credenciales no son válidas', async () => {
    const { page, notify } = setup({
      signIn: async () => {
        throw new AuthApiError(401, 'invalid_credentials', 'The credentials are not valid.');
      },
    });

    await page.send({ email: 'admin@akame.local', password: 'wrong' });

    expect(notify).toHaveBeenCalledWith(
      'Las credenciales no son válidas. Revisa tu correo y tu contraseña.',
      'Cerrar',
      { duration: 4000 },
    );
    expect(page.busy).toBe(false);
  });

  it('no envía el formulario mientras está en marcha', async () => {
    const { page, signIn } = setup();

    await Promise.all([
      page.send({ email: 'admin@akame.local', password: 'the-password' }),
      page.send({ email: 'admin@akame.local', password: 'the-password' }),
    ]);

    expect(signIn).toHaveBeenCalledTimes(1);
  });
});
