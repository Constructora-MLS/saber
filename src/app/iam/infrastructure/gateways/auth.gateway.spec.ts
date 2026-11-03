import '@angular/compiler';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../../api.config';
import { Email } from '../../domain/model/value-objects/email';
import { parseAccountPassword } from '../../domain/model/value-objects/password';
import { RecoveryToken } from '../../domain/model/value-objects/recovery-token';
import { AuthGateway } from './auth.gateway';

const user = {
  uuid: 'the-user',
  email: 'admin@akame.local',
  firstName: 'Admin',
  lastName: 'Akame',
  permissions: {
    manageEmployees: true,
    manageAssignments: false,
    manageCatalog: false,
    manageCertificates: false,
    manageUsers: true,
    managePermissionsGroups: false,
    administrator: false,
    owner: false,
  },
};

/** The permissions that the platform publishes with the identity. */
const permissions = {
  manageEmployees: true,
  manageAssignments: false,
  manageCatalog: false,
  manageCertificates: false,
  manageUsers: true,
  managePermissionsGroups: false,
  administrator: false,
  owner: false,
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
      identity: {
        uuid: 'the-user',
        email: 'admin@akame.local',
        firstName: 'Admin',
        lastName: 'Akame',
      },
      permissions: {
        manageEmployees: false,
        manageAssignments: false,
        manageCatalog: false,
        manageCertificates: false,
        manageUsers: false,
        managePermissionsGroups: false,
        administrator: false,
        owner: false,
      },
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
      identity: {
        uuid: 'the-user',
        email: 'admin@akame.local',
        firstName: 'Admin',
        lastName: 'Akame',
      },
      permissions: {
        manageEmployees: false,
        manageAssignments: false,
        manageCatalog: false,
        manageCertificates: false,
        manageUsers: false,
        managePermissionsGroups: false,
        administrator: false,
        owner: false,
      },
    });
  });

  it('transforma la respuesta de la verificación en la identidad y los permisos', async () => {
    const gateway = gatewayFor(user);

    await expect(gateway.verify()).resolves.toEqual({
      identity: {
        uuid: 'the-user',
        email: 'admin@akame.local',
        firstName: 'Admin',
        lastName: 'Akame',
      },
      permissions,
    });
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

  it('pide el enlace de recuperación con la dirección del cuerpo', async () => {
    const post = vi.fn(() => of({ status: 'accepted' }));
    const injector = Injector.create({
      providers: [
        { provide: API_BASE_URL, useValue: '/api/v1' },
        { provide: HttpClient, useValue: { post } },
      ],
    });
    const gateway = runInInjectionContext(injector, () => new AuthGateway());

    await gateway.forgotPassword(Email.create('admin@akame.local'));

    expect(post).toHaveBeenCalledWith('/api/v1/auth/forgot-password', {
      email: 'admin@akame.local',
    });
  });

  it('cambia la contraseña con el token y la contraseña del cuerpo', async () => {
    const post = vi.fn(() => of(null));
    const injector = Injector.create({
      providers: [
        { provide: API_BASE_URL, useValue: '/api/v1' },
        { provide: HttpClient, useValue: { post } },
      ],
    });
    const gateway = runInInjectionContext(injector, () => new AuthGateway());

    const token = RecoveryToken.create('a'.repeat(43));
    const password = parseAccountPassword('a-long-enough-password');

    await gateway.resetPassword(token, password);

    expect(post).toHaveBeenCalledWith('/api/v1/auth/reset-password', {
      token: 'a'.repeat(43),
      password: 'a-long-enough-password',
    });
  });

  it('traduce el rechazo del enlace de recuperación en el error del contexto', async () => {
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
                    status: 404,
                    error: {
                      code: 'password_reset_not_found',
                      detail: 'The token does not exist.',
                    },
                  }),
              ),
          },
        },
      ],
    });
    const gateway = runInInjectionContext(injector, () => new AuthGateway());

    await expect(
      gateway.resetPassword(
        RecoveryToken.create('a'.repeat(43)),
        parseAccountPassword('a-long-enough-password'),
      ),
    ).rejects.toMatchObject({
      name: 'AuthApiError',
      status: 404,
      code: 'password_reset_not_found',
      detail: 'The token does not exist.',
    });
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
