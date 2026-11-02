import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { ResetPasswordCommandService } from '../../../application/command-services/auth-command-services';
import { AuthSessionStore } from '../../../application/session/auth-session.store';
import { AuthValidationError } from '../../../domain/model/errors/auth-errors';
import { AuthApiError } from '../../../infrastructure/errors/auth-api.error';
import { ResetPasswordPage } from './reset-password.page';

const aToken = 'a'.repeat(43);
const aPassword = 'a-long-enough-password';
const theState = { navigationId: 7, ɵrouterPageId: 3 };

class Page extends ResetPasswordPage {
  get invalid() {
    return this.invalidLink();
  }
  get linkExpired() {
    return this.expired();
  }
  get done() {
    return this.saved();
  }
  get busy() {
    return this.submitting();
  }
  get error() {
    return this.errorMessage();
  }
  get fieldError() {
    return this.passwordError();
  }
  send(password: string) {
    return this.save({ password });
  }
  signIn() {
    return this.goToSignIn();
  }
  newLink() {
    return this.requestNewLink();
  }
}

describe('ResetPasswordPage', () => {
  function setup(
    options: {
      token?: string | null;
      execute?: () => Promise<void>;
    } = {},
  ) {
    const execute = vi.fn(options.execute ?? (async () => {}));
    const navigate = vi.fn().mockResolvedValue(true);
    const navigateByUrl = vi.fn().mockResolvedValue(true);
    const replaceState = vi.fn();
    const getState = vi.fn(() => theState);
    const clear = vi.fn();
    const token = options.token === undefined ? aToken : options.token;
    const injector = Injector.create({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: new Map(token ? [['token', token]] : []) },
          },
        },
        {
          provide: Router,
          useValue: {
            navigate,
            navigateByUrl,
            url: token ? `/reset-password?token=${token}` : '/reset-password',
          },
        },
        { provide: Location, useValue: { replaceState, getState } },
        { provide: ResetPasswordCommandService, useValue: { execute } },
        { provide: AuthSessionStore, useValue: { clear } },
      ],
    });
    const page = runInInjectionContext(injector, () => new Page());
    return { page, execute, navigate, navigateByUrl, replaceState, getState, clear };
  }

  it('lee el token del enlace una sola vez y lo quita de la barra de direcciones', () => {
    const { page, replaceState } = setup();

    page.ngOnInit();

    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalledWith('/reset-password', '', theState);
  });

  it('conserva el estado de la entrada del historial al quitar el token', () => {
    const { page, replaceState, getState } = setup();

    page.ngOnInit();

    // The state of the entry is the one of the router: a later navigation to
    // that entry is a navigation of the router and not a new page.
    expect(getState).toHaveBeenCalled();
    expect(replaceState.mock.calls[0][2]).toBe(theState);
  });

  it('no cambia la contraseña cuando el enlace no lleva un token', async () => {
    const { page, execute } = setup({ token: null });

    page.ngOnInit();
    await page.send(aPassword);

    expect(page.invalid).toBe(true);
    expect(execute).not.toHaveBeenCalled();
  });

  it('no cambia la contraseña cuando el token del enlace no es válido', async () => {
    const { page, execute } = setup({ token: 'too-short' });

    page.ngOnInit();
    await page.send(aPassword);

    expect(page.invalid).toBe(true);
    expect(execute).not.toHaveBeenCalled();
  });

  it('cambia la contraseña y olvida la sesión del navegador', async () => {
    const { page, execute, clear } = setup();

    page.ngOnInit();
    await page.send(aPassword);

    expect(execute).toHaveBeenCalledWith({ token: aToken, password: aPassword });
    expect(clear).toHaveBeenCalled();
    expect(page.done).toBe(true);
    expect(page.busy).toBe(false);
  });

  it('olvida el token del enlace cuando la contraseña ya fue cambiada', async () => {
    const { page, execute } = setup();

    page.ngOnInit();
    await page.send(aPassword);
    await page.send(aPassword);

    // The credential del enlace es muerta: la página no la vuelve a usar.
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('informa que el enlace venció o ya fue usado', async () => {
    const { page, clear } = setup({
      execute: async () => {
        throw new AuthApiError(404, 'password_reset_not_found', 'The token does not exist.');
      },
    });

    page.ngOnInit();
    await page.send(aPassword);

    expect(page.linkExpired).toBe(true);
    expect(page.done).toBe(false);
    expect(clear).not.toHaveBeenCalled();
  });

  it('no confunde otro 404 con un enlace que ya no sirve', async () => {
    const { page } = setup({
      execute: async () => {
        throw new AuthApiError(404, 'route_not_found', 'The route does not exist.');
      },
    });

    page.ngOnInit();
    await page.send(aPassword);

    expect(page.linkExpired).toBe(false);
    expect(page.error).toBe('No se pudo completar la operación. Inténtalo nuevamente.');
  });

  it('muestra junto al campo la política de la contraseña que la plataforma rechazó', async () => {
    const { page } = setup({
      execute: async () => {
        throw new AuthApiError(400, 'validation_error', 'The password is not valid.', [
          { field: 'password', message: 'The password is too short.' },
        ]);
      },
    });

    page.ngOnInit();
    await page.send(aPassword);

    expect(page.fieldError).toBe('La contraseña debe tener entre 12 y 30 caracteres.');
    expect(page.error).toBeNull();
  });

  it('muestra la razón del dominio cuando la contraseña no es válida', async () => {
    const { page } = setup({
      execute: async () => {
        throw new AuthValidationError('password', 'La contraseña es obligatoria.');
      },
    });

    page.ngOnInit();
    await page.send(aPassword);

    expect(page.error).toBe('La contraseña es obligatoria.');
    expect(page.fieldError).toBeNull();
  });

  it('avisa que el servicio no está disponible cuando la plataforma falla', async () => {
    const { page } = setup({
      execute: async () => {
        throw new AuthApiError(503, 'identity_store_unavailable', 'The store is down.');
      },
    });

    page.ngOnInit();
    await page.send(aPassword);

    expect(page.error).toBe(
      'El servicio no está disponible. Inténtalo nuevamente en unos instantes.',
    );
  });

  it('pide un enlace nuevo cuando el enlace ya no sirve', () => {
    const { page, navigateByUrl } = setup();

    page.newLink();

    expect(navigateByUrl).toHaveBeenCalledWith('/forgot-password');
  });

  it('lleva al inicio de sesión cuando la contraseña ya fue cambiada', () => {
    const { page, navigateByUrl } = setup();

    page.signIn();

    expect(navigateByUrl).toHaveBeenCalledWith('/sign-in');
  });
});
