import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
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
  get start() {
    return this.initialEmail();
  }
  send(command: { email: string }) {
    return this.request(command);
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
      ],
    });
    const page = runInInjectionContext(injector, () => new Page());
    return { page, execute };
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

  it('devuelve el formulario con la dirección escrita cuando la plataforma falla', async () => {
    const { page } = setup({
      execute: async () => {
        throw new Error('the platform is down');
      },
    });

    await page.send({ email: 'worker@akame.local' });

    expect(page.done).toBe(false);
    expect(page.start).toBe('worker@akame.local');
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

  it('no pide el enlace dos veces mientras está en marcha', async () => {
    const { page, execute } = setup();

    await Promise.all([
      page.send({ email: 'admin@akame.local' }),
      page.send({ email: 'admin@akame.local' }),
    ]);

    expect(execute).toHaveBeenCalledTimes(1);
  });
});
