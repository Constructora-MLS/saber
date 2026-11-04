import '@angular/compiler';
import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { firstValueFrom, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { SignInCommandService } from '../../application/command-services/auth-command-services';
import { AuthIdentity } from '../../domain/model/value-objects/auth-identity';
import { AuthSession } from '../../application/session/auth-session';
import { AuthSessionStore } from '../../application/session/auth-session.store';
import { AuthApiError } from '../errors/auth-api.error';
import { AuthGateway } from '../gateways/auth.gateway';
import { authInterceptor } from './auth.interceptor';

const identity: AuthIdentity = {
  uuid: 'the-user',
  email: 'admin@akame.local',
  firstName: 'Admin',
  lastName: 'Akame',
};

/** sessionOf is the session that the platform publishes. */
function sessionOf(accessToken: string): AuthSession {
  return { accessToken, identity };
}

/** theCredentialIsDead is the failure of a renewal with a revoked cookie. */
function theCredentialIsDead(): AuthApiError {
  return new AuthApiError(401, 'invalid_refresh_token', 'The refresh token is not valid.');
}

/** thePlatformIsDown is the failure of a renewal with an unreachable store. */
function thePlatformIsDown(): AuthApiError {
  return new AuthApiError(503, 'identity_store_unavailable', 'The store of the sessions is down.');
}


/** The account that the platform publishes with the identity. */
const account = {
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
};

describe('authInterceptor', () => {
  async function setup(
    options: {
      refresh?: () => Promise<AuthSession>;
      signedIn?: boolean;
      account?: typeof account;
    } = {},
  ) {
    const refresh = vi.fn(options.refresh ?? (async () => sessionOf('the-renewed-token')));
    // The platform signs a deterministic access token, so every sign in
    // publishes the very same token: a session that appears while a request
    // is in flight can only be told apart from the session that the
    // request carried by the identifier that the store gave to it.
    const signIn = vi.fn().mockResolvedValue(sessionOf('the-access-token'));
    const verify = vi.fn(async () => options.account ?? account);
    // The store of the session is the real one: the interceptor asks it the
    // single rule of the policy and never reads the status of the failure.
    const injector = Injector.create({
      providers: [
        {
          provide: AuthGateway,
          useValue: { refresh, verify, logout: vi.fn(), signIn: vi.fn() },
        },
        { provide: SignInCommandService, useValue: { execute: signIn } },
        { provide: AuthSessionStore, useFactory: () => new AuthSessionStore(), deps: [] },
      ],
    });
    const store = injector.get(AuthSessionStore);

    if (options.signedIn !== false) {
      await store.signIn({ email: 'admin@akame.local', password: 'the-password' });
    }
    // The sign in reads the permissions of the member once: the calls that
    // the tests observe are the ones that the requests provoke.
    verify.mockClear();

    // The mock is typed with its parameter, so the recorded calls keep the
    // type of the request that the interceptor sent.
    const next = vi.fn((_request: HttpRequest<unknown>) => of(new HttpResponse({ status: 200 })));
    const run = (url: string) =>
      runInInjectionContext(injector, () => authInterceptor(new HttpRequest('GET', url), next));

    return { run, next, store, refresh, verify };
  }

  it('no adjunta el access token a las rutas que no lo necesitan', async () => {
    const { run, next } = await setup();

    for (const url of [
      '/api/v1/auth/sign-in',
      '/api/v1/auth/refresh',
      '/api/v1/auth/logout',
      '/api/v1/auth/forgot-password',
      '/api/v1/auth/reset-password',
      '/api/v1/certificates/verify/the-code',
      '/api/v1/invitations/the-invitation',
    ]) {
      await firstValueFrom(run(url));
    }

    expect(next).toHaveBeenCalledTimes(7);
    for (const [request] of next.mock.calls) {
      expect(request.headers.get('Authorization')).toBeNull();
    }
  });

  it('adjunta el access token a las rutas privadas', async () => {
    const { run, next } = await setup();

    await firstValueFrom(run('/api/v1/users'));

    const [request] = next.mock.calls[0];
    expect(request.headers.get('Authorization')).toBe('Bearer the-access-token');
  });

  it('adjunta el access token a la verificación del usuario', async () => {
    const { run, next } = await setup();

    await firstValueFrom(run('/api/v1/auth/verify'));

    const [request] = next.mock.calls[0];
    expect(request.headers.get('Authorization')).toBe('Bearer the-access-token');
  });

  it('no renueva una petición que no lleva token', async () => {
    const { run, next, refresh } = await setup({ signedIn: false });
    next.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 401 })));

    await expect(firstValueFrom(run('/api/v1/users'))).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(refresh).not.toHaveBeenCalled();
    const [request] = next.mock.calls[0];
    expect(request.headers.get('Authorization')).toBeNull();
  });

  it('renueva la sesión y reintenta la petición cuando la plataforma responde 401', async () => {
    const { run, next, refresh } = await setup();
    next.mockImplementationOnce(() => throwError(() => new HttpErrorResponse({ status: 401 })));

    await firstValueFrom(run('/api/v1/users'));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(2);
    const retried = next.mock.calls[1][0];
    expect(retried.headers.get('Authorization')).toBe('Bearer the-renewed-token');
  });

  it('no reintenta la petición más de una vez', async () => {
    const { run, next, refresh } = await setup();
    next.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 401 })));

    await expect(firstValueFrom(run('/api/v1/users'))).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(next).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('conserva el contexto de la petición que reintenta', async () => {
    const { run, next } = await setup();
    next.mockImplementationOnce(() => throwError(() => new HttpErrorResponse({ status: 401 })));

    await firstValueFrom(run('/api/v1/users'));

    const retried = next.mock.calls[1][0];
    expect(retried.context).toBe(next.mock.calls[0][0].context);
  });

  it('abandona la sesión y publica el rechazo cuando la credencial está muerta', async () => {
    const { run, next, store } = await setup({
      refresh: async () => {
        throw theCredentialIsDead();
      },
    });
    next.mockImplementationOnce(() => throwError(() => new HttpErrorResponse({ status: 401 })));

    await expect(firstValueFrom(run('/api/v1/users'))).rejects.toBeInstanceOf(AuthApiError);

    expect(store.authenticated()).toBe(false);
    expect(store.credentialRejected()).toBe(true);
  });

  it('conserva la sesión cuando la renovación falla porque la plataforma no está disponible', async () => {
    const { run, next, store } = await setup({
      refresh: async () => {
        throw thePlatformIsDown();
      },
    });
    next.mockImplementationOnce(() => throwError(() => new HttpErrorResponse({ status: 401 })));

    await expect(firstValueFrom(run('/api/v1/users'))).rejects.toBeInstanceOf(AuthApiError);

    expect(store.authenticated()).toBe(true);
    expect(store.accessToken()).toBe('the-access-token');
    expect(store.credentialRejected()).toBe(false);
  });

  it('publica el rechazo cuando el reintento también es rechazado', async () => {
    const { run, next, store, refresh } = await setup();
    next.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 401 })));

    await expect(firstValueFrom(run('/api/v1/users'))).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(2);
    expect(store.authenticated()).toBe(false);
    expect(store.credentialRejected()).toBe(true);
  });

  it('no intenta renovar cuando la plataforma no está disponible', async () => {
    const { run, next, refresh, store } = await setup();
    next.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 503 })));

    await expect(firstValueFrom(run('/api/v1/users'))).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(refresh).not.toHaveBeenCalled();
    expect(store.authenticated()).toBe(true);
    expect(store.credentialRejected()).toBe(false);
  });

  it('renueva la sesión una sola vez cuando dos peticiones privadas fallan a la vez', async () => {
    let renew = (): void => {};
    const pending = new Promise<AuthSession>((resolve) => {
      renew = () => resolve(sessionOf('the-renewed-token'));
    });
    const { run, next, refresh } = await setup({ refresh: () => pending });
    next
      .mockImplementationOnce(() => throwError(() => new HttpErrorResponse({ status: 401 })))
      .mockImplementationOnce(() => throwError(() => new HttpErrorResponse({ status: 401 })));

    const first = firstValueFrom(run('/api/v1/users'));
    const second = firstValueFrom(run('/api/v1/groups'));

    expect(refresh).toHaveBeenCalledTimes(1);

    renew();
    await Promise.all([first, second]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(4);
  });

  it('publica el rechazo una sola vez cuando varias peticiones fallan a la vez con una credencial muerta', async () => {
    const { run, next, store } = await setup({
      refresh: async () => {
        throw theCredentialIsDead();
      },
    });
    const forget = vi.spyOn(store, 'forget');
    next.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 401 })));

    await Promise.all([
      firstValueFrom(run('/api/v1/users')).catch(() => undefined),
      firstValueFrom(run('/api/v1/groups')).catch(() => undefined),
    ]);

    expect(forget).toHaveBeenCalledTimes(2);
    // Only the first failure finds the session: the reaction is idempotent.
    expect(forget.mock.results.filter((result) => result.value === true)).toHaveLength(1);
    expect(store.authenticated()).toBe(false);
    expect(store.credentialRejected()).toBe(true);
  });

  it('no descarta la sesión que aparece mientras la renovación falla', async () => {
    // El sign in de esta misma pestaña llega mientras la renovación falla con
    // una credencial muerta: la sesión que acaba de aparecer es válida —y
    // lleva el mismo access token, porque el backend lo firma de forma
    // determinista—, así que el interceptor no puede destruirla.
    let store: AuthSessionStore | undefined;
    const {
      run,
      next,
      store: created,
    } = await setup({
      refresh: async () => {
        await store?.signIn({ email: 'admin@akame.local', password: 'the-password' });
        throw theCredentialIsDead();
      },
    });
    store = created;
    next.mockImplementationOnce(() => throwError(() => new HttpErrorResponse({ status: 401 })));

    await expect(firstValueFrom(run('/api/v1/users'))).rejects.toBeInstanceOf(AuthApiError);

    expect(store.authenticated()).toBe(true);
    expect(store.accessToken()).toBe('the-access-token');
    expect(store.credentialRejected()).toBe(false);
  });

  it('lee los permisos del miembro otra vez cuando la plataforma rechaza la operación', async () => {
    const { run, next, store, verify } = await setup({
      account: { ...account, permissions: { ...account.permissions, manageUsers: true } },
    });
    next.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 403 })));

    await expect(firstValueFrom(run('/api/v1/users'))).rejects.toBeInstanceOf(HttpErrorResponse);

    await vi.waitFor(() => expect(verify).toHaveBeenCalled());
    await vi.waitFor(() => expect(store.permissions().manageUsers).toBe(true));
  });

  it('no repite la operación que la plataforma rechazó', async () => {
    const { run, next } = await setup();
    next.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 403 })));

    await expect(firstValueFrom(run('/api/v1/users'))).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('no lee los permisos otra vez cuando la plataforma no rechaza la operación', async () => {
    const { run, next, verify } = await setup();
    next.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 409 })));

    await expect(firstValueFrom(run('/api/v1/users'))).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(verify).not.toHaveBeenCalled();
  });

  it('no lee los permisos otra vez cuando la lectura de los permisos es rechazada', async () => {
    // La lectura de los permisos nunca pide los permisos: la renovación de
    // la sesión termina con una lectura, así que la cadena se esperaría a
    // sí misma y se repetiría sola.
    const { run, next, verify } = await setup();
    next.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 403 })));

    await expect(firstValueFrom(run('/api/v1/auth/verify'))).rejects.toBeInstanceOf(
      HttpErrorResponse,
    );

    expect(verify).not.toHaveBeenCalled();
  });
});
