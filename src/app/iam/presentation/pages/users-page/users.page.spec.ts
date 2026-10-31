import '@angular/compiler';
import { DestroyRef, Injector, runInInjectionContext } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { describe, expect, it } from 'vitest';
import { ListUsersQueryService } from '../../../application/query-services/user-query-services';
import { PlatformUser } from '../../../domain/model/aggregates/platform-user';
import { Email, restoreEmail } from '../../../domain/model/value-objects/email';
import { UserId } from '../../../domain/model/value-objects/user-id';
import { UsersPage } from './users.page';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

const account = PlatformUser.restore(
  UserId.restore('2f4b1c66-9b4a-4f2f-9c1e-6a1f2b3c4d5e'),
  restoreEmail('member@example.test'),
  'Mina',
  'Kato',
  'active',
);

function pageWith(listUsers: ListUsersQueryService) {
  const injector = Injector.create({
    providers: [
      { provide: MatDialog, useValue: {} },
      { provide: MatSnackBar, useValue: {} },
      { provide: DestroyRef, useValue: { onDestroy: () => undefined } },
      { provide: ListUsersQueryService, useValue: listUsers },
    ],
  });

  return runInInjectionContext(injector, () => new UsersPage()) as unknown as {
    load(pageNumber: number): Promise<void>;
    loading(): boolean;
    rows(): readonly { id: string; name: string; email: string; status: string }[];
    page(): number;
    totalPages(): number;
  };
}

describe('UsersPage', () => {
  it('publishes the accounts of the page that was read', async () => {
    const page = pageWith({
      execute: async () => ({ items: [account], page: 1, totalPages: 1, total: 1 }),
    } as unknown as ListUsersQueryService);

    await page.load(1);

    expect(page.loading()).toBe(false);
    expect(page.rows()).toHaveLength(1);
    expect(page.rows()[0]?.name).toBe('Mina Kato');
    expect(page.rows()[0]?.email).toBe('member@example.test');
    expect(page.rows()[0]?.status).toBe('active');
  });

  it('keeps the initial empty list in loading state until the first answer arrives', async () => {
    const firstPage = deferred<{
      items: readonly PlatformUser[];
      page: number;
      totalPages: number;
      total: number;
    }>();
    const page = pageWith({
      execute: () => firstPage.promise,
    } as unknown as ListUsersQueryService);

    expect(page.loading()).toBe(true);
    expect(page.rows()).toEqual([]);

    const pendingLoad = page.load(1);
    expect(page.loading()).toBe(true);

    firstPage.resolve({ items: [], page: 1, totalPages: 0, total: 0 });
    await pendingLoad;

    expect(page.loading()).toBe(false);
    expect(page.rows()).toEqual([]);
  });

  it('reports the failure of the consultation instead of an empty listing', async () => {
    const page = pageWith({
      execute: async () => {
        throw new Error('the service is down');
      },
    } as unknown as ListUsersQueryService);

    await page.load(1);

    expect(page.loading()).toBe(false);
    expect(page.rows()).toEqual([]);
  });
});
