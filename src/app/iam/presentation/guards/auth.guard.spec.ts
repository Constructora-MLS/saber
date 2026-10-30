import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { AuthSessionStore } from '../../application/session/auth-session.store';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  function setup(session: { authenticated: () => boolean; restore: () => Promise<void> }) {
    const createUrlTree = vi.fn().mockReturnValue('the-url-tree' as unknown as UrlTree);
    const injector = Injector.create({
      providers: [
        { provide: AuthSessionStore, useValue: session },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });
    return {
      createUrlTree,
      run: () =>
        runInInjectionContext(injector, () =>
          authGuard({} as ActivatedRouteSnapshot, { url: '/employees' } as RouterStateSnapshot),
        ),
    };
  }

  it('deja pasar a quien ya tiene una sesión', async () => {
    const { run } = setup({ authenticated: () => true, restore: async () => {} });

    await expect(run()).resolves.toBe(true);
  });

  it('renueva la sesión antes de dejar pasar', async () => {
    const restore = vi.fn().mockResolvedValue(undefined);
    const { run } = setup({ authenticated: () => false, restore });

    await expect(run()).resolves.toBe(true);
    expect(restore).toHaveBeenCalled();
  });

  it('envía al sign in cuando no hay una sesión válida', async () => {
    const { createUrlTree, run } = setup({
      authenticated: () => false,
      restore: async () => {
        throw new Error('invalid refresh token');
      },
    });

    await expect(run()).resolves.toBe('the-url-tree');
    expect(createUrlTree).toHaveBeenCalledWith(['/sign-in']);
  });
});
