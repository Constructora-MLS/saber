import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { SignInCommandService } from '../command-services/auth-command-services';
import { PlatformUser } from '../../domain/model/aggregates/platform-user';
import { restoreEmail } from '../../domain/model/value-objects/email';
import { AuthIdentity } from '../../domain/model/value-objects/auth-identity';
import { UserId } from '../../domain/model/value-objects/user-id';
import { AuthGateway } from '../../infrastructure/gateways/auth.gateway';
import { AuthApiError } from '../../infrastructure/errors/auth-api.error';
import { AuthSessionStore } from './auth-session.store';

const identity: AuthIdentity = {
  uuid: 'the-user',
  email: 'admin@akame.local',
  firstName: 'Admin',
  lastName: 'Akame',
};

describe('AuthSessionStore', () => {
  function setup(refresh: () => Promise<{ accessToken: string; identity: AuthIdentity }>) {
    const signIn = vi.fn().mockResolvedValue({ accessToken: 'the-access-token', identity });
    const verify = vi.fn().mockResolvedValue({ ...identity, firstName: 'Administrador' });
    const logout = vi.fn().mockResolvedValue(undefined);
    const injector = Injector.create({
      providers: [
        { provide: AuthGateway, useValue: { refresh, verify, logout } },
        { provide: SignInCommandService, useValue: { execute: signIn } },
      ],
    });
    const store = runInInjectionContext(injector, () => new AuthSessionStore());
    return { store, signIn, verify, logout };
  }

  it('guarda la sesión del sign in', async () => {
    const { store, signIn } = setup(async () => ({ accessToken: 'x', identity }));

    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });

    expect(signIn).toHaveBeenCalledWith({
      email: 'admin@akame.local',
      password: 'the-password',
    });
    expect(store.authenticated()).toBe(true);
    expect(store.accessToken()).toBe('the-access-token');
    expect(store.identity()).toEqual(identity);
  });

  it('renueva la sesión con el refresh token de la cookie', async () => {
    const { store } = setup(async () => ({ accessToken: 'the-renewed-token', identity }));

    await store.restore();

    expect(store.accessToken()).toBe('the-renewed-token');
    expect(store.authenticated()).toBe(true);
  });

  it('renueva la sesión una sola vez cuando llegan dos navegaciones a la vez', async () => {
    const refresh = vi.fn().mockResolvedValue({ accessToken: 'the-renewed-token', identity });
    const { store } = setup(refresh);

    await Promise.all([store.restore(), store.restore()]);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('renueva la sesión de nuevo cuando la anterior ya terminó', async () => {
    const refresh = vi.fn().mockResolvedValue({ accessToken: 'the-renewed-token', identity });
    const { store } = setup(refresh);

    await store.restore();
    await store.restore();

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('verifica el usuario con el access token y actualiza su identidad', async () => {
    const { store, verify } = setup(async () => ({ accessToken: 'the-access-token', identity }));
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });

    await store.verify();

    expect(verify).toHaveBeenCalled();
    expect(store.identity()?.firstName).toBe('Administrador');
    expect(store.accessToken()).toBe('the-access-token');
  });

  it('edita el nombre de la cuenta y lo refleja en la sesión', async () => {
    const { store } = setup(async () => ({ accessToken: 'the-access-token', identity }));
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });

    store.applyProfile(
      PlatformUser.restore(
        UserId.restore('the-user'),
        restoreEmail('admin@akame.local'),
        'Administradora',
        'Akame',
        'active',
      ),
    );

    expect(store.identity()?.firstName).toBe('Administradora');
    expect(store.identity()?.lastName).toBe('Akame');
    expect(store.identity()?.email).toBe('admin@akame.local');
    expect(store.accessToken()).toBe('the-access-token');
  });

  it('olvida la sesión cuando la plataforma confirma el cierre', async () => {
    const { store, logout } = setup(async () => ({ accessToken: 'the-access-token', identity }));
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });

    await store.logout();

    expect(logout).toHaveBeenCalled();
    expect(store.authenticated()).toBe(false);
    expect(store.accessToken()).toBeNull();
    expect(store.identity()).toBeNull();
  });

  it('conserva la sesión cuando la plataforma no confirma el cierre', async () => {
    const { store, logout } = setup(async () => ({ accessToken: 'the-access-token', identity }));
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });
    logout.mockRejectedValue(new Error('the platform is down'));

    await expect(store.logout()).rejects.toThrow();
    expect(store.authenticated()).toBe(true);
    expect(store.accessToken()).toBe('the-access-token');
  });

  it('abandona la sesión sin cerrarla en la plataforma', async () => {
    const { store } = setup(async () => ({ accessToken: 'the-access-token', identity }));
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });

    store.clear();

    expect(store.authenticated()).toBe(false);
    expect(store.accessToken()).toBeNull();
  });

  it('reconoce la credencial que la plataforma rechazó', () => {
    const { store } = setup(async () => ({ accessToken: 'the-access-token', identity }));

    expect(
      store.platformRejectedTheCredential(new AuthApiError(401, 'invalid_refresh_token', 'dead')),
    ).toBe(true);
  });

  it('no confunde la plataforma que no está disponible con una credencial rechazada', () => {
    const { store } = setup(async () => ({ accessToken: 'the-access-token', identity }));

    expect(
      store.platformRejectedTheCredential(new AuthApiError(503, 'service_unavailable', 'down')),
    ).toBe(false);
    expect(
      store.platformRejectedTheCredential(new AuthApiError(500, 'unexpected_error', 'boom')),
    ).toBe(false);
    expect(store.platformRejectedTheCredential(new Error('the network is down'))).toBe(false);
  });

  it('olvida la sesión y publica el rechazo cuando la credencial es la que falló', async () => {
    const { store } = setup(async () => ({ accessToken: 'the-access-token', identity }));
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });

    expect(store.forget(store.sessionId())).toBe(true);
    expect(store.authenticated()).toBe(false);
    expect(store.credentialRejected()).toBe(true);
    expect(store.rejectionCount()).toBe(1);
  });

  it('no descarta una sesión que no es la que falló', async () => {
    const { store } = setup(async () => ({ accessToken: 'the-access-token', identity }));
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });
    const failedSessionId = store.sessionId();

    // El sign in de esta misma pestaña llega mientras la renovación falla:
    // la sesión que acaba de aparecer es válida y la que falló no es suya,
    // así que no puede destruirla.
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });

    expect(store.forget(failedSessionId)).toBe(false);
    expect(store.authenticated()).toBe(true);
    expect(store.accessToken()).toBe('the-access-token');
    expect(store.credentialRejected()).toBe(false);
  });

  it('publica el rechazo otra vez cuando la credencial muere después de una renovación', async () => {
    const { store } = setup(async () => ({ accessToken: 'the-renewed-token', identity }));
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });

    expect(store.forget(store.sessionId())).toBe(true);
    expect(store.rejectionCount()).toBe(1);

    // La cookie sobrevivió: la renovación devuelve una sesión viva, pero la
    // credencial vuelve a morir después.
    await store.restore();

    expect(store.authenticated()).toBe(true);
    expect(store.forget(store.sessionId())).toBe(true);
    expect(store.rejectionCount()).toBe(2);
  });

  it('no destruye la sesión nueva cuando el access token es el mismo', async () => {
    // El backend firma un JWT determinista: dos sign in del mismo usuario
    // en el mismo segundo producen el mismo access token.
    const { store } = setup(async () => ({ accessToken: 'the-access-token', identity }));
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });
    const failedSessionId = store.sessionId();

    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });

    expect(store.accessToken()).toBe('the-access-token');
    expect(store.sessionId()).not.toBe(failedSessionId);
    expect(store.forget(failedSessionId)).toBe(false);
    expect(store.authenticated()).toBe(true);
  });

  it('olvida la sesión una sola vez cuando la reacción llega repetida', async () => {
    const { store } = setup(async () => ({ accessToken: 'the-access-token', identity }));
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });
    const sessionId = store.sessionId();

    expect(store.forget(sessionId)).toBe(true);
    expect(store.forget(sessionId)).toBe(false);
    expect(store.authenticated()).toBe(false);
    expect(store.credentialRejected()).toBe(true);
    expect(store.rejectionCount()).toBe(1);
  });

  it('descarta el rechazo cuando el usuario inicia sesión otra vez', async () => {
    const { store } = setup(async () => ({ accessToken: 'the-access-token', identity }));
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });
    store.forget(store.sessionId());

    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });

    expect(store.authenticated()).toBe(true);
    expect(store.credentialRejected()).toBe(false);
    expect(store.rejectionCount()).toBe(0);
  });

  it('no publica la sesión renovada cuando otra sesión aparece mientras la renovación viaja', async () => {
    let renew: (session: { accessToken: string; identity: AuthIdentity }) => void = () => {};
    const pending = new Promise<{ accessToken: string; identity: AuthIdentity }>((resolve) => {
      renew = resolve;
    });
    const { store } = setup(() => pending);

    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });
    const restoring = store.restore();

    // El sign in de esta misma pestaña llega mientras la renovación viaja:
    // la sesión que acaba de aparecer es la del usuario y la renovación no
    // puede reemplazarla.
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });
    const signedInSessionId = store.sessionId();

    renew({ accessToken: 'the-renewed-token', identity });
    await restoring;

    expect(store.accessToken()).toBe('the-access-token');
    expect(store.sessionId()).toBe(signedInSessionId);
  });

  it('no deja una sesión cuando la renovación falla', async () => {
    const { store } = setup(async () => {
      throw new Error('invalid refresh token');
    });

    await expect(store.restore()).rejects.toThrow();
    expect(store.authenticated()).toBe(false);
    expect(store.accessToken()).toBeNull();
  });
});
