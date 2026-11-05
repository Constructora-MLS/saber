import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { SignInCommandService } from '../../application/command-services/auth-command-services';
import { AuthSessionStore } from '../../application/session/auth-session.store';
import {
  EFFECTIVE_PERMISSIONS,
  EffectivePermissions,
} from '../../domain/model/value-objects/effective-permissions';
import { AuthApiError } from '../../infrastructure/errors/auth-api.error';
import { AuthGateway } from '../../infrastructure/gateways/auth.gateway';
import { permissionGuard } from './permission.guard';

describe('permissionGuard', () => {
  const identity = {
    uuid: 'the-user',
    email: 'admin@akame.local',
    firstName: 'Admin',
    lastName: 'Akame',
  };

  function setup(
    options: {
      permissions?: EffectivePermissions;
      refreshed?: EffectivePermissions;
      refreshFails?: boolean;
    } = {},
  ) {
    const createUrlTree = vi.fn((commands: unknown) => ({ commands }));
    let permissions = options.permissions ?? EFFECTIVE_PERMISSIONS;
    const refreshPermissions = vi.fn(async () => {
      if (options.refreshFails) {
        throw new Error('the platform is not available');
      }
      if (options.refreshed) {
        permissions = options.refreshed;
      }
    });
    const injector = Injector.create({
      providers: [
        {
          provide: AuthSessionStore,
          useValue: {
            permissions: () => permissions,
            authenticated: () => true,
            restore: vi.fn(async () => undefined),
            refreshPermissions,
          },
        },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });
    const guard = (route: { data?: Record<string, unknown> }) =>
      runInInjectionContext(injector, () => permissionGuard(route, []));
    return { guard, createUrlTree, refreshPermissions };
  }

  it('deja pasar a quien tiene el permiso de la ruta', async () => {
    const { guard, refreshPermissions } = setup({
      permissions: { ...EFFECTIVE_PERMISSIONS, manageEmployees: true },
    });

    await expect(guard({ data: { permission: ['manageEmployees'] } })).resolves.toBe(true);
    expect(refreshPermissions).not.toHaveBeenCalled();
  });

  it('deja pasar a quien tiene cualquiera de los permisos de la ruta', async () => {
    const { guard } = setup({
      permissions: { ...EFFECTIVE_PERMISSIONS, manageUsers: true },
    });

    await expect(
      guard({ data: { permission: ['manageUsers', 'managePermissionsGroups'] } }),
    ).resolves.toBe(true);
  });

  it('deja pasar a una ruta que no pide ningún permiso', async () => {
    const { guard } = setup();

    await expect(guard({ data: {} })).resolves.toBe(true);
  });

  it('lleva a la página de acceso denegado a quien no tiene el permiso', async () => {
    const { guard, createUrlTree } = setup({
      permissions: { ...EFFECTIVE_PERMISSIONS, manageEmployees: true },
    });

    const result = await guard({ data: { permission: ['manageCatalog'] } });

    expect(createUrlTree).toHaveBeenCalledWith(['/forbidden']);
    expect(result).toEqual({ commands: ['/forbidden'] });
  });

  it('lleva a la página sin permisos a quien no tiene ninguno', async () => {
    const { guard, createUrlTree } = setup();

    await guard({ data: { permission: ['manageEmployees'] } });

    expect(createUrlTree).toHaveBeenCalledWith(['/no-permissions']);
  });

  it('pregunta al plataforma por los permisos cuando la ruta está negada', async () => {
    const { guard, refreshPermissions } = setup({
      permissions: EFFECTIVE_PERMISSIONS,
      refreshed: { ...EFFECTIVE_PERMISSIONS, manageCatalog: true },
    });

    await expect(guard({ data: { permission: ['manageCatalog'] } })).resolves.toBe(true);
    expect(refreshPermissions).toHaveBeenCalledTimes(1);
  });

  it('mantiene la negativa cuando la lectura de los permisos falla', async () => {
    const { guard, createUrlTree, refreshPermissions } = setup({ refreshFails: true });

    const result = await guard({ data: { permission: ['manageEmployees'] } });

    expect(refreshPermissions).toHaveBeenCalledTimes(1);
    expect(createUrlTree).toHaveBeenCalledWith(['/no-permissions']);
    expect(result).toEqual({ commands: ['/no-permissions'] });
  });

  it('renueva la sesión y abre la ruta cuando el token de acceso expiró', async () => {
    // El token de acceso venció, la cookie de la sesión sigue viva y el
    // miembro recibió el permiso en otra sesión: la lectura de los
    // permisos renueva la sesión una vez y la ruta se abre.
    const createUrlTree = vi.fn((commands: unknown) => ({ commands }));
    const refresh = vi.fn().mockResolvedValue({ accessToken: 'the-renewed-token', identity });
    const verify = vi
      .fn()
      .mockResolvedValueOnce({ identity, permissions: EFFECTIVE_PERMISSIONS })
      .mockRejectedValueOnce(new AuthApiError(401, 'unauthorized', 'The access token expired.'))
      .mockResolvedValue({
        identity,
        permissions: { ...EFFECTIVE_PERMISSIONS, manageCatalog: true },
      });

    const injector = Injector.create({
      providers: [
        { provide: AuthGateway, useValue: { refresh, verify, logout: vi.fn() } },
        {
          provide: SignInCommandService,
          useValue: {
            execute: vi.fn().mockResolvedValue({
              accessToken: 'the-access-token',
              identity,
              permissions: EFFECTIVE_PERMISSIONS,
            }),
          },
        },
        { provide: Router, useValue: { createUrlTree } },
        {
          provide: AuthSessionStore,
          useFactory: () => new AuthSessionStore(),
          deps: [],
        },
      ],
    });
    const store = injector.get(AuthSessionStore);
    await store.signIn({ email: 'admin@akame.local', password: 'the-password' });

    const guard = (route: { data?: Record<string, unknown> }) =>
      runInInjectionContext(injector, () => permissionGuard(route, []));

    await expect(guard({ data: { permission: ['manageCatalog'] } })).resolves.toBe(true);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(createUrlTree).not.toHaveBeenCalled();
  });
});
