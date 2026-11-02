import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { AcceptInvitationCommandService } from '../../../application/command-services/user-command-services';
import { GetInvitationQueryService } from '../../../application/query-services/user-query-services';
import { PlatformUser } from '../../../domain/model/aggregates/platform-user';
import { restoreEmail } from '../../../domain/model/value-objects/email';
import { UserId } from '../../../domain/model/value-objects/user-id';
import { UserApiError } from '../../../infrastructure/errors/user-api.error';
import { AcceptInvitationPage } from './accept-invitation.page';

function pageWith(
  token: string | null,
  invitation: { email: string } | Error,
  acceptance: PlatformUser | Error,
) {
  const injector = Injector.create({
    providers: [
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { queryParamMap: new Map(token ? [['token', token]] : []) } },
      },
      { provide: Router, useValue: { navigateByUrl: () => Promise.resolve(true) } },
      {
        provide: GetInvitationQueryService,
        useValue: {
          execute: async () => {
            if (invitation instanceof Error) {
              throw invitation;
            }
            return invitation.email;
          },
        },
      },
      {
        provide: AcceptInvitationCommandService,
        useValue: {
          execute: async () => {
            if (acceptance instanceof Error) {
              throw acceptance;
            }
            return acceptance;
          },
        },
      },
    ],
  });

  return runInInjectionContext(injector, () => new AcceptInvitationPage()) as unknown as {
    ngOnInit(): void;
    email(): string | null;
    expired(): boolean;
    loading(): boolean;
    acceptedName(): string | null;
    accept(data: { firstName: string; lastName: string; password: string }): Promise<void>;
  };
}

const account = PlatformUser.restore(
  UserId.restore('2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e'),
  restoreEmail('member@example.test'),
  'Mina',
  'Kato',
  'active',
);

describe('AcceptInvitationPage', () => {
  it('shows the address that the invitation bound', async () => {
    const page = pageWith('the-token', { email: 'member@example.test' }, account);

    page.ngOnInit();
    await Promise.resolve();

    expect(page.loading()).toBe(false);
    expect(page.expired()).toBe(false);
    expect(page.email()).toBe('member@example.test');
  });

  it('reports an invitation that is not valid anymore', async () => {
    const page = pageWith(
      'the-token',
      new UserApiError(404, 'invitation_not_found', 'The invitation does not exist.'),
      account,
    );

    page.ngOnInit();
    await Promise.resolve();

    expect(page.expired()).toBe(true);
    expect(page.loading()).toBe(false);
  });

  it('reports a link without a token as an invitation that is not valid', async () => {
    const page = pageWith(null, { email: 'member@example.test' }, account);

    page.ngOnInit();
    await Promise.resolve();

    expect(page.expired()).toBe(true);
  });

  it('activates the account of the invitation', async () => {
    const page = pageWith('the-token', { email: 'member@example.test' }, account);

    page.ngOnInit();
    await Promise.resolve();

    await page.accept({
      firstName: 'Mina',
      lastName: 'Kato',
      password: 'a-long-enough-password',
    });

    expect(page.acceptedName()).toBe('Mina Kato');
    expect(page.expired()).toBe(false);
  });

  it('reports an invitation that was already used when the account is activated', async () => {
    const page = pageWith(
      'the-token',
      { email: 'member@example.test' },
      new UserApiError(404, 'invitation_not_found', 'The invitation does not exist.'),
    );

    page.ngOnInit();
    await Promise.resolve();

    await page.accept({
      firstName: 'Mina',
      lastName: 'Kato',
      password: 'a-long-enough-password',
    });

    expect(page.expired()).toBe(true);
    expect(page.acceptedName()).toBeNull();
  });
});
