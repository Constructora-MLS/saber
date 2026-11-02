import '@angular/compiler';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from '../../../api.config';
import { Email } from '../../domain/model/value-objects/email';
import { UserId } from '../../domain/model/value-objects/user-id';
import { UserGateway } from './user.gateway';

const account = {
  uuid: '2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e',
  email: 'member@example.test',
  firstName: 'Mina',
  lastName: 'Kato',
  status: 'active' as const,
};

describe('UserGateway', () => {
  function gatewayFor(client: Partial<HttpClient>): UserGateway {
    const injector = Injector.create({
      providers: [
        { provide: API_BASE_URL, useValue: '/api/v1' },
        { provide: HttpClient, useValue: client },
      ],
    });
    return runInInjectionContext(injector, () => new UserGateway());
  }

  it('reads a page of accounts and hands the domain its users', async () => {
    const get = vi.fn(() => of({ items: [account], page: 2, totalPages: 3, total: 42 }));
    const gateway = gatewayFor({ get });

    const page = await gateway.listUsers({ search: 'mina', status: 'active', page: 2, limit: 20 });

    expect(page.page).toBe(2);
    expect(page.totalPages).toBe(3);
    expect(page.total).toBe(42);
    expect(page.items[0]?.fullName).toBe('Mina Kato');
    expect(page.items[0]?.status).toBe('active');
    expect(page.items[0]?.email).toBe('member@example.test');

    const [url, options] = get.mock.calls[0] as [
      string,
      { params: { get(key: string): string | null } },
    ];
    expect(url).toBe('/api/v1/users');
    expect(options.params.get('search')).toBe('mina');
    expect(options.params.get('status')).toBe('active');
    expect(options.params.get('page')).toBe('2');
  });

  it('leaves a pending account without name, because it was never activated', async () => {
    const gateway = gatewayFor({
      get: () =>
        of({
          items: [{ ...account, firstName: '', lastName: '', status: 'pending' }],
          page: 1,
          totalPages: 1,
          total: 1,
        }),
    });

    const page = await gateway.listUsers({});

    expect(page.items[0]?.fullName).toBe('');
    expect(page.items[0]?.email).toBe('member@example.test');
    expect(page.items[0]?.status).toBe('pending');
  });

  it('sends the invitation of a member and never asks for the credential', async () => {
    const post = vi.fn(() =>
      of({ email: 'member@example.test', status: 'pending', expiresIn: 604800 }),
    );
    const gateway = gatewayFor({ post });

    const invitation = await gateway.inviteUser(Email.create('Member@Example.test'));

    expect(invitation).toEqual({ email: 'member@example.test', expiresIn: 604800 });
    expect(post).toHaveBeenCalledWith('/api/v1/users/invitations', {
      email: 'member@example.test',
    });
  });

  it('disables an account with the identifier of the account', async () => {
    const remove = vi.fn(() => of(null));
    const gateway = gatewayFor({ delete: remove });

    await gateway.deleteUser(UserId.restore(account.uuid));

    expect(remove).toHaveBeenCalledWith(`/api/v1/users/${account.uuid}`);
  });

  it('reads the address that an invitation bound without consuming it', async () => {
    const get = vi.fn(() => of({ email: 'member@example.test' }));
    const gateway = gatewayFor({ get });

    await expect(gateway.getInvitation('the-token')).resolves.toBe('member@example.test');
    expect(get).toHaveBeenCalledWith('/api/v1/invitations/the-token');
  });

  it('activates the account of an invitation', async () => {
    const post = vi.fn(() => of(account));
    const gateway = gatewayFor({ post });

    const user = await gateway.acceptInvitation('the-token', {
      firstName: 'Mina',
      lastName: 'Kato',
      password: 'a-long-enough-password',
    });

    expect(user.fullName).toBe('Mina Kato');
    expect(user.status).toBe('active');
    expect(post).toHaveBeenCalledWith('/api/v1/invitations/the-token/accept', {
      firstName: 'Mina',
      lastName: 'Kato',
      password: 'a-long-enough-password',
    });
  });

  it('edita el nombre de la cuenta con un PATCH al perfil del usuario', async () => {
    const patch = vi.fn(() => of({ ...account, firstName: 'Mina', lastName: 'Kato Jr.' }));
    const gateway = gatewayFor({ patch });

    const user = await gateway.updateProfile({ firstName: 'Mina', lastName: 'Kato Jr.' });

    expect(user.fullName).toBe('Mina Kato Jr.');
    expect(user.email).toBe('member@example.test');
    expect(patch).toHaveBeenCalledWith('/api/v1/auth/profile', {
      firstName: 'Mina',
      lastName: 'Kato Jr.',
    });
  });

  it('traduce el rechazo de la plataforma al editar el nombre en el error del contexto', async () => {
    const gateway = gatewayFor({
      patch: () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 404,
              error: { code: 'user_not_found', detail: 'The user is not available anymore.' },
            }),
        ),
    });

    await expect(gateway.updateProfile({ firstName: 'Mina' })).rejects.toMatchObject({
      name: 'UserApiError',
      status: 404,
      code: 'user_not_found',
    });
  });

  it('translates the rejection of the platform into the error of the context', async () => {
    const gateway = gatewayFor({
      post: () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { code: 'user_conflict', detail: 'The email is already registered.' },
            }),
        ),
    });

    await expect(gateway.inviteUser(Email.create('member@example.test'))).rejects.toMatchObject({
      name: 'UserApiError',
      status: 409,
      code: 'user_conflict',
    });
  });

  it('translates a response that does not follow the contract into an unexpected failure', async () => {
    const gateway = gatewayFor({
      get: () => throwError(() => new HttpErrorResponse({ status: 500, error: 'boom' })),
    });

    await expect(gateway.listUsers({})).rejects.toMatchObject({
      name: 'UserApiError',
      status: 500,
      code: 'unexpected_error',
    });
  });
});
