import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { isPublicRoute, PUBLIC_ROUTE_PATHS, routes } from './app.routes';

describe('public certificate routes', () => {
  it('lazy-loads verification and redirects the legacy URL', async () => {
    const verifyRoute = routes.find((route) => route.path === 'verify/:code');
    expect(verifyRoute?.loadComponent).toBeTypeOf('function');
    expect(await verifyRoute!.loadComponent!()).toBeTruthy();

    expect(routes.find((route) => route.path === 'verificar/:code')).toMatchObject({
      pathMatch: 'full',
      redirectTo: 'verify/:code',
    });
  });
});

describe('the routes of the recovery of the password', () => {
  it('declares the path that the link of the email points to', async () => {
    // The backend builds the link as {FRONTEND_PUBLIC_URL}/reset-password?
    // token=… , so the path and the parameter are not negotiable.
    const resetRoute = routes.find((route) => route.path === 'reset-password');
    expect(resetRoute?.data?.['public']).toBe(true);
    expect(resetRoute?.loadComponent).toBeTypeOf('function');
    expect(await resetRoute!.loadComponent!()).toBeTruthy();

    const forgotRoute = routes.find((route) => route.path === 'forgot-password');
    expect(forgotRoute?.data?.['public']).toBe(true);
    expect(await forgotRoute!.loadComponent!()).toBeTruthy();
  });
});

describe('public routes', () => {
  it('declares the public flows of the platform', () => {
    expect(PUBLIC_ROUTE_PATHS).toEqual([
      'sign-in',
      'accept-invitation',
      'forgot-password',
      'reset-password',
      'not-found',
      'verify/:code',
      'verificar/:code',
    ]);
  });

  it('recognizes the URLs of the public flows', () => {
    expect(isPublicRoute('/sign-in')).toBe(true);
    expect(isPublicRoute('/accept-invitation')).toBe(true);
    expect(isPublicRoute('/forgot-password')).toBe(true);
    expect(isPublicRoute('/reset-password')).toBe(true);
    expect(isPublicRoute('/not-found')).toBe(true);
    expect(isPublicRoute('/verify/the-code')).toBe(true);
    expect(isPublicRoute('/verificar/the-code')).toBe(true);
  });

  it('does not recognize the URLs of the private flows', () => {
    expect(isPublicRoute('/employees')).toBe(false);
    expect(isPublicRoute('/settings')).toBe(false);
    expect(isPublicRoute('/users')).toBe(false);
    expect(isPublicRoute('/verify')).toBe(false);
  });
});
