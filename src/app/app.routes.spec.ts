import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

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
