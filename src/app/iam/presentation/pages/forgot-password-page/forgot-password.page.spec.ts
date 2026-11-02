import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { ForgotPasswordCommandService } from '../../../application/command-services/auth-command-services';
import { AuthSessionStore } from '../../../application/session/auth-session.store';
import { AuthValidationError } from '../../../domain/model/errors/auth-errors';
import { AuthApiError } from '../../../infrastructure/errors/auth-api.error';
import { ForgotPasswordPage } from './forgot-password.page';

class Page extends ForgotPasswordPage {
  get busy() {
    return this.sending();
  }
  get done() {
    return this.sent();
  }
  get claimsSent() {
    return this.confirmsSent();
  }
  get error() {
    return this.errorMessage();
  }
  get fieldError() {
    return this.emailError();
  }
  get address() {
    return this.email();
  }
  get asked() {
    return this.requestedEmail();
  }
  send(command: { email: string }) {
    return this.request(command);
  }
  sendAgain() {
    return this.resend();
  }
  back() {
    return this.goToSignIn();
  }
}

describe('ForgotPasswordPage', () => {
  function setup(
    options: {
      execute?: () => Promise<void>;
      authenticated?: boolean;
    } = {},
  ) {
    const execute = vi.fn(options.execute ?? (async () => {}));
    const navigateByUrl = vi.fn().mockResolvedValue(true);
    const injector = Injector.create({
      providers: [
        { provide: ForgotPasswordCommandService, useValue: { execute } },
        {
          provide: AuthSessionStore,
          useValue: {
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
      ],
    });
    const page = runInInjectionContext(injector, () => new Page());
    return { page, execute, navigateByUrl };
  }

  it('prellena el formulario con el correo de la sesión', () => {
    const { page } = setup();

    expect(page.address).toBe('admin@akame.local');
  });

  it('pide el enlace de recuperación con la dirección del formulario', async () => {
    const { page, execute } = setup();

    await page.send({ email: 'admin@akame.local' });

    expect(execute).toHaveBeenCalledWith({ email: 'admin@akame.local' });
    expect(page.done).toBe(true);
    expect(page.busy).toBe(false);
  });

  it('muestra el mismo mensaje cuando la dirección no tiene ninguna cuenta', async () => {
    const { page } = setup();

    await page.send({ email: 'unknown@akame.local' });

    expect(page.done).toBe(true);
    expect(page.error).toBeNull();
  });

  it('avisa con el mensaje de la página cuando la plataforma falla', async () => {
    const { page } = setup({
      execute: async () => {
        throw new Error('the platform is down');
      },
    });

    await page.send({ email: 'admin@akame.local' });

    expect(page.done).toBe(false);
    expect(page.error).toBe('No se pudo completar la operación. Inténtalo nuevamente.');
    expect(page.busy).toBe(false);
  });

  it('muestra junto al campo el fallo de la dirección que la plataforma rechazó', async () => {
    const { page } = setup({
      execute: async () => {
        throw new AuthApiError(400, 'validation_error', 'The email is not valid.', [
          { field: 'email', message: 'The email is not valid.' },
        ]);
      },
    });

    await page.send({ email: 'admin@akame.local' });

    expect(page.fieldError).toBe('El correo electrónico no es válido.');
    expect(page.error).toBeNull();
  });

  it('muestra la razón del dominio cuando la dirección no es válida', async () => {
    const { page } = setup({
      execute: async () => {
        throw new AuthValidationError('email', 'El correo electrónico no es válido.');
      },
    });

    await page.send({ email: 'admin@akame.local' });

    expect(page.error).toBe('El correo electrónico no es válido.');
    expect(page.fieldError).toBeNull();
  });

  it('muestra el mismo mensaje neutro cuando la plataforma responde que no encontró la cuenta', async () => {
    const { page } = setup({
      execute: async () => {
        throw new AuthApiError(404, 'user_not_found', 'The account does not exist.');
      },
    });

    await page.send({ email: 'admin@akame.local' });

    expect(page.error).toBe('No se pudo completar la operación. Inténtalo nuevamente.');
    expect(page.error).not.toContain('enlace');
  });

  it('avisa cuando el reenvío del enlace falla y no afirma que el enlace se envió', async () => {
    let attempts = 0;
    const { page } = setup({
      execute: async () => {
        attempts += 1;
        if (attempts > 1) {
          throw new Error('the platform is down');
        }
      },
    });

    await page.send({ email: 'admin@akame.local' });
    expect(page.claimsSent).toBe(true);

    await page.sendAgain();

    expect(page.error).not.toBeNull();
    expect(page.error).toBe('No se pudo completar la operación. Inténtalo nuevamente.');
    expect(page.claimsSent).toBe(false);
  });

  it('vuelve a enviar el enlace con la misma dirección', async () => {
    const { page, execute } = setup();

    await page.send({ email: 'admin@akame.local' });
    await page.sendAgain();

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute).toHaveBeenLastCalledWith({ email: 'admin@akame.local' });
    expect(page.asked).toBe('admin@akame.local');
    expect(page.done).toBe(true);
  });

  it('no pide el enlace dos veces mientras está en marcha', async () => {
    const { page, execute } = setup();

    await Promise.all([
      page.send({ email: 'admin@akame.local' }),
      page.send({ email: 'admin@akame.local' }),
    ]);

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('vuelve al inicio de sesión', () => {
    const { page, navigateByUrl } = setup();

    page.back();

    expect(navigateByUrl).toHaveBeenCalledWith('/sign-in');
  });
});
