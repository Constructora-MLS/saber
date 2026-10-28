import '@angular/compiler';
import { DestroyRef, Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { describe, expect, it } from 'vitest';
import { CreateWorkUnitCommandService } from '../../../application/command-services/catalog-command-services';
import { CatalogPage } from '../../../application/queries/catalog-queries';
import { ListServicesQueryService } from '../../../application/query-services/catalog-query-services';
import { Service } from '../../../domain/model/aggregates/service';
import { CatalogName } from '../../../domain/model/value-objects/catalog-name';
import { CreateWorkUnitDialog } from './create-work-unit-dialog';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createService(id: string): Service {
  return Service.create(id, CatalogName.create(`Servicio ${id}`), null, 'ACTIVE');
}

function setup() {
  const requests: ReturnType<typeof deferred<CatalogPage<Service>>>[] = [];
  const listServices = {
    execute: () => {
      const request = deferred<CatalogPage<Service>>();
      requests.push(request);
      return request.promise;
    },
  };
  const injector = Injector.create({
    providers: [
      { provide: FormBuilder, useValue: new FormBuilder() },
      { provide: CreateWorkUnitCommandService, useValue: { execute: async () => undefined } },
      { provide: ListServicesQueryService, useValue: listServices },
      { provide: MatDialogRef, useValue: { close: () => undefined } },
      { provide: DestroyRef, useValue: { onDestroy: () => undefined } },
    ],
  });
  const dialog = runInInjectionContext(injector, () => new CreateWorkUnitDialog()) as unknown as {
    searchServices(term: string): Promise<void>;
    services(): readonly Service[];
    servicesError(): string | null;
    loadingServices(): boolean;
  };
  return { dialog, requests };
}

describe('CreateWorkUnitDialog service search', () => {
  it('does not let an older result replace the latest search', async () => {
    const { dialog, requests } = setup();
    const oldSearch = dialog.searchServices('antiguo');
    const currentSearch = dialog.searchServices('actual');

    requests[1].resolve({ items: [createService('actual')], page: 1, totalPages: 1, total: 1 });
    await currentSearch;
    requests[0].resolve({ items: [createService('antiguo')], page: 1, totalPages: 1, total: 1 });
    await oldSearch;

    expect(dialog.services().map((service) => service.id)).toEqual(['actual']);
    expect(dialog.loadingServices()).toBe(false);
  });

  it('ignores an error from an older search after the latest result succeeds', async () => {
    const { dialog, requests } = setup();
    const oldSearch = dialog.searchServices('antiguo');
    const currentSearch = dialog.searchServices('actual');

    requests[1].resolve({ items: [createService('actual')], page: 1, totalPages: 1, total: 1 });
    await currentSearch;
    requests[0].reject(new Error('old request failed'));
    await oldSearch;

    expect(dialog.services().map((service) => service.id)).toEqual(['actual']);
    expect(dialog.servicesError()).toBeNull();
    expect(dialog.loadingServices()).toBe(false);
  });
});
