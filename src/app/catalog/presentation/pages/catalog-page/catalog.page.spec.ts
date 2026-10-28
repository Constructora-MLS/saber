import '@angular/compiler';
import { DestroyRef, Injector, runInInjectionContext } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { describe, expect, it } from 'vitest';
import {
  ListPositionsQueryService,
  ListRegimeQueryService,
  ListServicesQueryService,
  ListWorkUnitsQueryService,
} from '../../../application/query-services/catalog-query-services';
import { CatalogPage } from './catalog.page';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('CatalogPage', () => {
  it('ignora una carga anterior que termina después de la más reciente', async () => {
    const oldRequest = deferred<{ items: never[]; page: number; totalPages: number; total: number }>();
    const currentRequest = deferred<{ items: never[]; page: number; totalPages: number; total: number }>();
    let requestCount = 0;
    const workUnits = {
      execute: () => (requestCount++ === 0 ? oldRequest.promise : currentRequest.promise),
    };
    const noResults = { execute: async () => ({ items: [], page: 1, totalPages: 0, total: 0 }) };
    const injector = Injector.create({
      providers: [
        { provide: MatDialog, useValue: {} },
        { provide: MatSnackBar, useValue: {} },
        { provide: DestroyRef, useValue: { onDestroy: () => undefined } },
        { provide: ListServicesQueryService, useValue: noResults },
        { provide: ListPositionsQueryService, useValue: noResults },
        { provide: ListRegimeQueryService, useValue: noResults },
        { provide: ListWorkUnitsQueryService, useValue: workUnits },
      ],
    });
    const page = runInInjectionContext(injector, () => new CatalogPage()) as unknown as {
      load(pageNumber: number): Promise<void>;
      page(): number;
      loading(): boolean;
    };

    expect(page.loading()).toBe(true);

    const oldLoad = page.load(1);
    const currentLoad = page.load(2);

    currentRequest.resolve({ items: [], page: 2, totalPages: 3, total: 45 });
    await currentLoad;
    oldRequest.resolve({ items: [], page: 1, totalPages: 3, total: 45 });
    await oldLoad;

    expect(page.page()).toBe(2);
    expect(page.loading()).toBe(false);
  });
});
