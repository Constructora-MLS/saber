import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionStore } from '../../application/session/auth-session.store';
import { EFFECTIVE_PERMISSIONS } from '../../domain/model/value-objects/effective-permissions';
import { permissionGuard } from './permission.guard';

describe('permissionGuard', () => {
  function setup(permissions = EFFECTIVE_PERMISSIONS) {
    const createUrlTree = vi.fn((commands: unknown) => ({ commands }));
    const injector = Injector.create({
      providers: [
        {
          provide: AuthSessionStore,
          useValue: {
            permissions: () => permissions,
            authenticated: () => true,
            restore: vi.fn(async () => undefined),
          },
        },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });
    const guard = (route: { data?: Record<string, unknown> }) =>
      runInInjectionContext(injector, () => permissionGuard(route, []));
    return { guard, createUrlTree };
  }

  it('deja pasar a quien tiene el permiso de la ruta', async () => {
    const { guard } = setup({
      ...EFFECTIVE_PERMISSIONS,
      manageEmployees: true,
    });

    await expect(guard({ data: { permission: ['manageEmployees'] } })).resolves.toBe(true);
  });

  it('deja pasar a quien tiene cualquiera de los permisos de la ruta', async () => {
    const { guard } = setup({
      ...EFFECTIVE_PERMISSIONS,
      manageUsers: true,
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
      ...EFFECTIVE_PERMISSIONS,
      manageEmployees: true,
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
});
