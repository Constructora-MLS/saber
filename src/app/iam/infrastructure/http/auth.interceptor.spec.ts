import '@angular/compiler';
import { HttpErrorResponse, HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
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

describe('authInterceptor', () => {
  async function setup(options: { refresh?: () => Promise<AuthSession>; signedIn?: boolean } = {}) {
    const refresh = vi.fn(options.refresh ?? (async () => sessionOf('the-renewed-token')));
    const navigate = vi.fn().mockResolvedValue(true);
    // The store of the session is the real one: the interceptor asks it the
    // single rule of the policy and never reads the status of the failure.
    const injector = Injector.create({
      providers: [
        {
          provide: AuthGateway,
          useValue: { refresh, verify: vi.fn(), logout: vi.fn(), signIn: vi.fn() },
        },
        {
          provide: SignInCommandService,
          useValue: { execute: vi.fn(async () => sessionOf('the-access-token')) },
        },
        { provide: Router, useValue: { navigate } },
        { provide: AuthSessionStore, useFactory: () => new AuthSessionStore(), deps: [] },
      ],
    });
    const store = injector.get(AuthSessionStore);

    if (options.signedIn !== false) {
      await store.signIn({ email: 'admin@akame.local', password: 'the-password' });
    }

    const next = vi.fn(() => of(new HttpResponse({ status: 200 })));
    const run = (url: string) =>
      runInInjectionContext(injector, () =>
        authInterceptor(new HttpRequest('GET', url), next as unknown as HttpHandlerFn),
      );

    return { run, next, store, refresh, navigate };
  }

  it('no adjunta el access token a las rutas que no lo necesitan', async () => {
    const { run, next } = await setup();

    for (const url of [
      '/api/v1/auth/sign-in',
      '/api/v1/auth/refresh',
      '/api/v1/auth/logout',
      '/api/v1/certificates/verify/the-code',
      '/api/v1/invitations/the-invitation',
    ]) {
      await firstValueFrom(run(url));
    }

    expect(next).toHaveBeenCalledTimes(5);
    for (const [request] of next.mock.calls) {
      expect((request as HttpRequest<unknown>).headers.get('Authorization')).toBeNull();
    }
  });

  it('adjunta el access token a las rutas privadas', async () => {
    const { run, next } = await setup();

    await firstValueFrom(run('/api/v1/users'));

    const [request] = next.mock.calls[0];
    expect((request as HttpRequest<unknown>).headers.get('Authorization')).toBe(
      'Bearer the-access-token',
    );
  });

  it('adjunta el access token a la verificación del usuario', async () => {
    const { run, next } = await setup();

    await firstValueFrom(run('/api/v1/auth/verify'));

    const [request] = next.mock.calls[0];
    expect((request as HttpRequest<unknown>).headers.get('Authorization')).toBe(
      'Bearer the-access-token',
    );
  });

  it('no renueva una petición que no lleva token', async () => {
    const { run, next, refresh } = await setup({ signedIn: false });
    next.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 401 })));

    await expect(firstValueFrom(run('/api/v1/users'))).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(refresh).not.toHaveBeenCalled();
    const [request] = next.mock.calls[0];
    expect((request as HttpRequest<unknown>).headers.get('Authorization')).toBeNull();
  });

  it('renueva la sesión y reintenta la petición cuando la plataforma responde 401', async () => {
    const { run, next, refresh } = await setup();
    next.mockImplementationOnce(() => throwError(() => new HttpErrorResponse({ status: 401 })));

    await firstValueFrom(run('/api/v1/users'));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(2);
    const retried = next.mock.calls[1][0] as HttpRequest<unknown>;
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

    const retried = next.mock.calls[1][0] as HttpRequest<unknown>;
    expect(retried.context).toBe((next.mock.calls[0][0] as HttpRequest<unknown>).context);
  });

  it('abandona la sesión y lleva al sign in cuando la credencial está muerta', async () => {
    const { run, next, store, navigate } = await setup({
      refresh: async () => {
        throw theCredentialIsDead();
      },
    });
    next.mockImplementationOnce(() => throwError(() => new HttpErrorResponse({ status: 401 })));

    await expect(firstValueFrom(run('/api/v1/users'))).rejects.toBeInstanceOf(AuthApiError);

    expect(store.authenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/sign-in']);
  });

  it('conserva la sesión cuando la renovación falla porque la plataforma no está disponible', async () => {
    const { run, next, store, navigate } = await setup({
      refresh: async () => {
        throw thePlatformIsDown();
      },
    });
    next.mockImplementationOnce(() => throwError(() => new HttpErrorResponse({ status: 401 })));

    await expect(firstValueFrom(run('/api/v1/users'))).rejects.toBeInstanceOf(AuthApiError);

    expect(store.authenticated()).toBe(true);
    expect(store.accessToken()).toBe('the-access-token');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('limpia la sesión cuando el reintento también es rechazado', async () => {
    const { run, next, store, navigate, refresh } = await setup();
    next.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 401 })));

    await expect(firstValueFrom(run('/api/v1/users'))).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(2);
    expect(store.authenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('no intenta renovar cuando la plataforma no está disponible', async () => {
    const { run, next, refresh, store } = await setup();
    next.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 503 })));

    await expect(firstValueFrom(run('/api/v1/users'))).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(refresh).not.toHaveBeenCalled();
    expect(store.authenticated()).toBe(true);
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

  it('lleva al sign in una sola vez cuando varias peticiones fallan a la vez con una credencial muerta', async () => {
    const { run, next, store, navigate } = await setup({
      refresh: async () => {
        throw theCredentialIsDead();
      },
    });
    next.mockImplementation(() => throwError(() => new HttpErrorResponse({ status: 401 })));

    await Promise.all([
      firstValueFrom(run('/api/v1/users')).catch(() => undefined),
      firstValueFrom(run('/api/v1/groups')).catch(() => undefined),
    ]);

    expect(store.authenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
