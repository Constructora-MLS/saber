import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { SignInCommandService } from '../../application/command-services/auth-command-services';
import { AuthIdentity } from '../../domain/model/value-objects/auth-identity';
import { AuthSession } from '../../application/session/auth-session';
import { AuthSessionStore } from '../../application/session/auth-session.store';
import { AuthApiError } from '../../infrastructure/errors/auth-api.error';
import { AuthGateway } from '../../infrastructure/gateways/auth.gateway';
import { authGuard } from './auth.guard';

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

describe('authGuard', () => {
  async function setup(options: { refresh?: () => Promise<AuthSession>; signedIn?: boolean } = {}) {
    const refresh = vi.fn(options.refresh ?? (async () => sessionOf('the-renewed-token')));
    const createUrlTree = vi.fn().mockReturnValue('the-url-tree' as unknown as UrlTree);
    // The store of the session is the real one: the guard renews with it
    // and never reads the status of the error.
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
        { provide: Router, useValue: { createUrlTree } },
        { provide: AuthSessionStore, useFactory: () => new AuthSessionStore(), deps: [] },
      ],
    });
    const store = injector.get(AuthSessionStore);

    if (options.signedIn !== false) {
      await store.signIn({ email: 'admin@akame.local', password: 'the-password' });
    }

    return {
      store,
      refresh,
      createUrlTree,
      run: () =>
        runInInjectionContext(injector, () =>
          authGuard({} as ActivatedRouteSnapshot, { url: '/employees' } as RouterStateSnapshot),
        ),
    };
  }

  it('deja pasar a quien ya tiene una sesión', async () => {
    const { run, refresh } = await setup();

    await expect(run()).resolves.toBe(true);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('renueva la sesión antes de dejar pasar', async () => {
    const { run, store, refresh } = await setup({ signedIn: false });

    await expect(run()).resolves.toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(store.authenticated()).toBe(true);
  });

  it('envía al sign in cuando la credencial está muerta', async () => {
    const { run, createUrlTree, store } = await setup({
      signedIn: false,
      refresh: async () => {
        throw theCredentialIsDead();
      },
    });

    await expect(run()).resolves.toBe('the-url-tree');
    expect(createUrlTree).toHaveBeenCalledWith(['/sign-in']);
    expect(store.authenticated()).toBe(false);
  });

  it('no crea una sesión cuando la plataforma no está disponible', async () => {
    const { run, createUrlTree, store } = await setup({
      signedIn: false,
      refresh: async () => {
        throw thePlatformIsDown();
      },
    });

    await expect(run()).resolves.toBe('the-url-tree');
    expect(createUrlTree).toHaveBeenCalledWith(['/sign-in']);
    expect(store.authenticated()).toBe(false);
  });

  it('no descarta la sesión que aparece mientras la renovación falla', async () => {
    // El sign in de esta misma pestaña llega mientras la renovación falla con
    // una credencial muerta: la sesión que acaba de aparecer es válida y el
    // guard no puede destruirla, porque no es suya.
    let store: AuthSessionStore | undefined;
    const {
      run,
      createUrlTree,
      store: created,
    } = await setup({
      signedIn: false,
      refresh: async () => {
        await store?.signIn({ email: 'admin@akame.local', password: 'the-password' });
        throw theCredentialIsDead();
      },
    });
    store = created;

    await expect(run()).resolves.toBe('the-url-tree');
    expect(createUrlTree).toHaveBeenCalledWith(['/sign-in']);
    expect(store.authenticated()).toBe(true);
  });
});
