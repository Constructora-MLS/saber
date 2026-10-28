import '@angular/compiler';
import { DestroyRef, Injector, runInInjectionContext } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { describe, expect, it } from 'vitest';
import { ListEmployeesQueryService } from '../../../application/query-services/employee-query-services';
import { Employee } from '../../../domain/model/aggregates/employee';
import { EmployeePage } from '../../../application/queries/employee-queries';
import { DNI } from '../../../domain/model/value-objects/dni';
import { EmployeeId } from '../../../domain/model/value-objects/employee-id';
import { PersonName } from '../../../domain/model/value-objects/person-name';
import { RegimeId } from '../../../domain/model/value-objects/regime-id';
import {
  CATALOG_REFERENCE_RESOLVER,
  RegimeReference,
} from '../../../infrastructure/acl/catalog-reference.acl';
import { EmployeesPage } from './employees.page';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('EmployeesPage', () => {
  it('keeps loading until employees are published after regime references resolve', async () => {
    const regimeReferences = deferred<ReadonlyMap<string, RegimeReference>>();
    let notifyRegimeRequestStarted!: () => void;
    const regimeRequestStarted = new Promise<void>((resolve) => {
      notifyRegimeRequestStarted = resolve;
    });
    const employee = Employee.restore(
      EmployeeId.restore('2c3f4a5b-6d7e-8f90-a1b2-c3d4e5f67890'),
      PersonName.restore('Ana'),
      PersonName.restore('Pérez'),
      DNI.restore('12345678'),
      RegimeId.restore('4d5e6f70-8192-a3b4-c5d6-e7f8091a2b3c'),
      'VIGENTE',
    );
    const injector = Injector.create({
      providers: [
        { provide: MatDialog, useValue: {} },
        { provide: MatSnackBar, useValue: {} },
        { provide: DestroyRef, useValue: { onDestroy: () => undefined } },
        {
          provide: ListEmployeesQueryService,
          useValue: {
            execute: async () => ({ items: [employee], page: 1, totalPages: 1, total: 1 }),
          },
        },
        {
          provide: CATALOG_REFERENCE_RESOLVER,
          useValue: {
            resolveRegimes: () => {
              notifyRegimeRequestStarted();
              return regimeReferences.promise;
            },
          },
        },
      ],
    });
    const page = runInInjectionContext(injector, () => new EmployeesPage()) as unknown as {
      load(pageNumber: number): Promise<void>;
      loading(): boolean;
      rows(): readonly { name: string }[];
    };

    const pendingLoad = page.load(1);
    await regimeRequestStarted;

    expect(page.loading()).toBe(true);
    expect(page.rows()).toEqual([]);

    regimeReferences.resolve(new Map());
    await pendingLoad;

    expect(page.loading()).toBe(false);
    expect(page.rows()).toHaveLength(1);
    expect(page.rows()[0]?.name).toBe('Ana Pérez');
  });

  it('keeps the initial empty list in loading state until the first empty response arrives', async () => {
    const firstPage = deferred<EmployeePage<Employee>>();
    const injector = Injector.create({
      providers: [
        { provide: MatDialog, useValue: {} },
        { provide: MatSnackBar, useValue: {} },
        { provide: DestroyRef, useValue: { onDestroy: () => undefined } },
        { provide: ListEmployeesQueryService, useValue: { execute: () => firstPage.promise } },
        {
          provide: CATALOG_REFERENCE_RESOLVER,
          useValue: { resolveRegimes: async () => new Map() },
        },
      ],
    });
    const page = runInInjectionContext(injector, () => new EmployeesPage()) as unknown as {
      load(pageNumber: number): Promise<void>;
      loading(): boolean;
      rows(): readonly unknown[];
    };

    expect(page.loading()).toBe(true);
    expect(page.rows()).toEqual([]);

    const pendingLoad = page.load(1);
    expect(page.loading()).toBe(true);

    firstPage.resolve({ items: [], page: 1, totalPages: 0, total: 0 });
    await pendingLoad;

    expect(page.loading()).toBe(false);
    expect(page.rows()).toEqual([]);
  });
});
