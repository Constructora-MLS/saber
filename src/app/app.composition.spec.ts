import '@angular/compiler';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { AuthSessionStore } from './iam/application/session/auth-session.store';
import { authInterceptor } from './iam/infrastructure/http/auth.interceptor';

/**
 * The token that the platform publishes when the sign in succeeds.
 */
const tokenResource = {
  accessToken: 'the-access-token',
  tokenType: 'Bearer',
  expiresIn: 900,
  user: {
    uuid: 'the-user',
    email: 'admin@akame.local',
    firstName: 'Admin',
    lastName: 'Akame',
  },
};

/** userResource is the answer of the platform when the browser asks who it is. */
const userResource = {
  uuid: 'the-user',
  email: 'admin@akame.local',
  firstName: 'Admin',
  lastName: 'Akame',
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

/** theCredentialIsDead is the answer of the platform when it refuses the credential. */
const THE_CREDENTIAL_IS_DEAD = {
  body: 'The refresh token is not valid.',
  init: { status: 401, statusText: 'Unauthorized' },
};


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

describe('the chain of a dead credential', () => {
  beforeAll(async () => {
    // The suite runs without a browser, so the environment of the tests is
    // the one of the platform browser. It is the environment that owns the
    // scheduler of the effects, and the tests run the pending work of the
    // effects by hand.
    const { BrowserTestingModule, platformBrowserTesting } =
      await import('@angular/platform-browser/testing');
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  /**
   * setup wires the whole chain of the application: the real interceptor of
   * the HTTP boundary, the real gateway, the real store of the session and
   * the real shell of the application. Only the platform is faked, with the
   * controller of the HTTP client, and the router, whose navigation is
   * observed.
   */
  function setup(url = '/employees') {
    const navigate = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate, url } },
        // The document of the browser does not exist in the suite: the
        // tests never render the shell, they only read its reaction.
        { provide: DOCUMENT, useValue: {} },
      ],
    });

    const http = TestBed.inject(HttpClient);
    const platform = TestBed.inject(HttpTestingController);
    const store = TestBed.inject(AuthSessionStore);

    TestBed.runInInjectionContext(() => new App());

    return { http, platform, store, navigate };
  }

  /**
   * signIn opens a session of the browser with the answer of the platform.
   *
   * The sign in travels through the real command service and the real
   * gateway, so the session of the browser is the one that the platform
   * published.
   */
  async function signIn(store: AuthSessionStore, platform: HttpTestingController): Promise<void> {
    const signing = store.signIn({
      email: 'admin@akame.local',
      password: 'the-password',
    });

    platform.expectOne('/api/v1/auth/sign-in').flush(tokenResource);

    // The session reads the permissions of the member right after the sign
    // in: the platform publishes them with the identity.
    await flushVerification(platform);

    await signing;
  }

  /**
   * flushVerification answers the verification of the platform when it
   * travels.
   *
   * The verification leaves the browser right after the sign in resolves,
   * so the suite waits for it instead of assuming when it travels.
   */
  async function flushVerification(platform: HttpTestingController): Promise<void> {
    await vi.waitFor(() => {
      const [request] = platform.match('/api/v1/auth/verify');
      if (!request) {
        throw new Error('the verification has not travelled yet');
      }
      request.flush(userResource);
    });
  }

  it('lleva al sign in una sola vez cuando la plataforma rechaza una petición privada', async () => {
    const { http, platform, store, navigate } = setup();

    await signIn(store, platform);

    const request = firstValueFrom(http.get('/api/v1/users'));

    // La petición privada viaja con el token de la sesión: el
    // interceptor real está en la cadena.
    const privateRequest = platform.expectOne('/api/v1/users');
    expect(privateRequest.request.headers.get('Authorization')).toBe('Bearer the-access-token');
    privateRequest.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // La renovación viaja al platform y la plataforma rechaza la cookie.
    platform.expectOne('/api/v1/auth/refresh').flush(THE_CREDENTIAL_IS_DEAD.body, {
      ...THE_CREDENTIAL_IS_DEAD.init,
    });

    await expect(request).rejects.toMatchObject({ status: 401 });

    TestBed.tick();

    expect(store.rejectionCount()).toBe(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/sign-in']);
    platform.verify();
  });

  it('lleva al sign in una sola vez cuando varias peticiones privadas fallan a la vez', async () => {
    const { http, platform, store, navigate } = setup();

    await signIn(store, platform);

    const requests = [
      firstValueFrom(http.get('/api/v1/users')),
      firstValueFrom(http.get('/api/v1/groups')),
      firstValueFrom(http.get('/api/v1/catalog')),
    ];

    for (const url of ['/api/v1/users', '/api/v1/groups', '/api/v1/catalog']) {
      platform.expectOne(url).flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    }

    // Las tres peticiones comparten la misma renovación.
    platform.expectOne('/api/v1/auth/refresh').flush(THE_CREDENTIAL_IS_DEAD.body, {
      ...THE_CREDENTIAL_IS_DEAD.init,
    });

    await Promise.all(requests.map((request) => request.catch(() => undefined)));

    TestBed.tick();

    expect(store.rejectionCount()).toBe(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/sign-in']);
    platform.verify();
  });

  it('lee los permisos una sola vez cuando la plataforma rechaza la lectura', async () => {
    const { http, platform, store } = setup();

    await signIn(store, platform);

    const request = firstValueFrom(http.get('/api/v1/users'));
    platform.expectOne('/api/v1/users').flush('Forbidden', { status: 403, statusText: 'Forbidden' });

    // La plataforma rechaza la operación, así que el navegador lee los
    // permisos del miembro otra vez.
    await vi.waitFor(() => {
      const [verification] = platform.match('/api/v1/auth/verify');
      if (!verification) {
        throw new Error('the verification has not travelled yet');
      }
      verification.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    await expect(request).rejects.toMatchObject({ status: 403 });

    // El rechazo de la lectura no pide los permisos otra vez: la cadena
    // termina aquí y no se repite sola.
    await new Promise((resolve) => setTimeout(resolve, 0));
    platform.verify();
  });
});
