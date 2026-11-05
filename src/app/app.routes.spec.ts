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

describe('the routes of the personnel', () => {
  /** childRoute finds a route among the children of the application shells. */
  function childRoute(path: string) {
    const parent = routes.find((route) => route.children?.some((child) => child.path === path));
    return parent?.children?.find((child) => child.path === path);
  }

  it('opens the personnel and its assignments with the same permission', () => {
    expect(childRoute('employees')?.data?.['permission']).toEqual(['manageEmployees']);
    expect(childRoute('employees/:employeeId/assignments')?.data?.['permission']).toEqual([
      'manageEmployees',
    ]);
  });

  it('does not ask for a permission that administers the assignments apart', () => {
    const asked = routes.flatMap((route) => [
      ...((route.data?.['permission'] as readonly string[] | undefined) ?? []),
      ...((route.children ?? []).flatMap(
        (child) => (child.data?.['permission'] as readonly string[] | undefined) ?? [],
      )),
    ]);

    expect(asked).not.toContain('manageAssignments');
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
