import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { SignInCommandService } from '../command-services/auth-command-services';
import { AuthIdentity } from '../../domain/model/value-objects/auth-identity';
import { AuthGateway } from '../../infrastructure/gateways/auth.gateway';
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

  it('cierra la sesión y la olvida en el navegador', async () => {
    const { store, logout } = setup(async () => ({ accessToken: 'the-access-token', identity }));
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });

    await store.logout();

    expect(logout).toHaveBeenCalled();
    expect(store.authenticated()).toBe(false);
    expect(store.accessToken()).toBeNull();
    expect(store.identity()).toBeNull();
  });

  it('olvida la sesión aunque la plataforma falle al cerrarla', async () => {
    const { store, logout } = setup(async () => ({ accessToken: 'the-access-token', identity }));
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });
    logout.mockRejectedValue(new Error('the platform is down'));

    await expect(store.logout()).rejects.toThrow();
    expect(store.authenticated()).toBe(false);
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
