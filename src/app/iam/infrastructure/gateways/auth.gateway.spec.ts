import '@angular/compiler';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../../api.config';
import { AuthGateway } from './auth.gateway';

const user = {
  uuid: 'the-user',
  email: 'admin@akame.local',
  firstName: 'Admin',
  lastName: 'Akame',
};

describe('AuthGateway', () => {
  function gatewayFor(response: unknown) {
    const injector = Injector.create({
      providers: [
        { provide: API_BASE_URL, useValue: '/api/v1' },
        {
          provide: HttpClient,
          useValue: { post: () => of(response), get: () => of(response) },
        },
      ],
    });
    return runInInjectionContext(injector, () => new AuthGateway());
  }

  it('transforma la respuesta del sign in en una sesión', async () => {
    const gateway = gatewayFor({
      accessToken: 'the-access-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user,
    });

    await expect(gateway.signIn('admin@akame.local', 'the-password')).resolves.toEqual({
      accessToken: 'the-access-token',
      identity: user,
    });
  });

  it('transforma la respuesta de la renovación en una sesión', async () => {
    const gateway = gatewayFor({
      accessToken: 'the-renewed-token',
      tokenType: 'Bearer',
      expiresIn: 900,
      user,
    });

    await expect(gateway.refresh()).resolves.toEqual({
      accessToken: 'the-renewed-token',
      identity: user,
    });
  });

  it('transforma la respuesta de la verificación en la identidad del usuario', async () => {
    const gateway = gatewayFor(user);

    await expect(gateway.verify()).resolves.toEqual(user);
  });

  it('cierra la sesión con el endpoint de logout', async () => {
    const post = vi.fn(() => of(null));
    const injector = Injector.create({
      providers: [
        { provide: API_BASE_URL, useValue: '/api/v1' },
        { provide: HttpClient, useValue: { post } },
      ],
    });
    const gateway = runInInjectionContext(injector, () => new AuthGateway());

    await gateway.logout();

    expect(post).toHaveBeenCalledWith('/api/v1/auth/logout', {});
  });

  it('traduce el rechazo de las credenciales en el error del contexto', async () => {
    const injector = Injector.create({
      providers: [
        { provide: API_BASE_URL, useValue: '/api/v1' },
        {
          provide: HttpClient,
          useValue: {
            post: () =>
              throwError(
                () =>
                  new HttpErrorResponse({
                    status: 401,
                    error: {
                      code: 'invalid_credentials',
                      detail: 'The credentials are not valid.',
                    },
                  }),
              ),
          },
        },
      ],
    });
    const gateway = runInInjectionContext(injector, () => new AuthGateway());

    await expect(gateway.signIn('admin@akame.local', 'wrong')).rejects.toMatchObject({
      name: 'AuthApiError',
      status: 401,
      code: 'invalid_credentials',
      detail: 'The credentials are not valid.',
    });
  });

  it('traduce una respuesta que no sigue el contrato en un fallo inesperado', async () => {
    const injector = Injector.create({
      providers: [
        { provide: API_BASE_URL, useValue: '/api/v1' },
        {
          provide: HttpClient,
          useValue: {
            post: () => throwError(() => new HttpErrorResponse({ status: 500, error: 'boom' })),
          },
        },
      ],
    });
    const gateway = runInInjectionContext(injector, () => new AuthGateway());

    await expect(gateway.refresh()).rejects.toMatchObject({
      name: 'AuthApiError',
      status: 500,
      code: 'unexpected_error',
    });
  });
});
