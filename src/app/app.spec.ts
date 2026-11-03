import '@angular/compiler';
import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { SignInCommandService } from './iam/application/command-services/auth-command-services';
import { AuthIdentity } from './iam/domain/model/value-objects/auth-identity';
import { AuthSession } from './iam/application/session/auth-session';
import { AuthSessionStore } from './iam/application/session/auth-session.store';
import { AuthGateway } from './iam/infrastructure/gateways/auth.gateway';

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

describe('App', () => {
  beforeAll(async () => {
    // The suite runs without a browser, so the environment of the tests is
    // the one of the platform browser. It is the environment that owns the
    // scheduler of the effects, and the tests run the pending work of the
    // effects by hand.
    const { BrowserTestingModule, platformBrowserTesting } =
      await import('@angular/platform-browser/testing');
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  async function setup(url = '/employees') {
    TestBed.resetTestingModule();
    const navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthGateway,
          // La renovación devuelve una sesión viva: la cookie sobrevivió a
          // la muerte de la credencial.
          useValue: {
            refresh: vi.fn(async () => sessionOf('the-access-token')),
            verify: vi.fn(async () => account),
            logout: vi.fn(),
          },
        },
        {
          provide: SignInCommandService,
          useValue: { execute: vi.fn(async () => sessionOf('the-access-token')) },
        },
        { provide: Router, useValue: { navigate, url } },
        // The document of the browser does not exist in the suite: the
        // tests never render the shell, they only read its reaction.
        { provide: DOCUMENT, useValue: {} },
      ],
    });
    const store = TestBed.inject(AuthSessionStore);
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });

    TestBed.runInInjectionContext(() => new App());

    return { store, navigate };
  }

  it('lleva al sign in cuando la plataforma rechaza la credencial', async () => {
    const { store, navigate } = await setup();

    store.forget(store.sessionId());
    TestBed.tick();

    expect(navigate).toHaveBeenCalledWith(['/sign-in']);
  });

  it('no lleva al sign in cuando la credencial no fue rechazada', async () => {
    const { store, navigate } = await setup();

    TestBed.tick();

    expect(store.credentialRejected()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('no saca al usuario del sign in que ya está firmando', async () => {
    const { store, navigate } = await setup('/sign-in');

    store.forget(store.sessionId());
    TestBed.tick();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('no interrumpe un flujo público cuando la credencial muere', async () => {
    for (const url of ['/accept-invitation', '/verify/the-code', '/verificar/the-code']) {
      const { store, navigate } = await setup(url);

      store.forget(store.sessionId());
      TestBed.tick();

      expect(navigate).not.toHaveBeenCalled();
    }
  });

  it('vuelve a llevar al sign in cuando la credencial muere después de una renovación', async () => {
    const { store, navigate } = await setup();

    store.forget(store.sessionId());
    TestBed.tick();

    expect(navigate).toHaveBeenCalledTimes(1);

    // La cookie sobrevivió: la renovación devuelve una sesión viva, pero la
    // credencial vuelve a morir después.
    await store.restore();

    expect(store.authenticated()).toBe(true);

    store.forget(store.sessionId());
    TestBed.tick();

    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith(['/sign-in']);
  });

  it('lleva al sign in una sola vez por cada credencial muerta', async () => {
    const { store, navigate } = await setup();

    store.forget(store.sessionId());
    TestBed.tick();

    // El usuario vuelve a entrar: la credencial nueva muere después.
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });
    store.forget(store.sessionId());
    TestBed.tick();

    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith(['/sign-in']);
  });
});
