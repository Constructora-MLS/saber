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

describe('public routes', () => {
  it('declares the public flows of the platform', () => {
    expect(PUBLIC_ROUTE_PATHS).toEqual([
      'sign-in',
      'accept-invitation',
      'verify/:code',
      'verificar/:code',
    ]);
  });

  it('recognizes the URLs of the public flows', () => {
    expect(isPublicRoute('/sign-in')).toBe(true);
    expect(isPublicRoute('/accept-invitation')).toBe(true);
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
