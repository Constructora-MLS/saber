// Package repositories holds the ports of the Employees bounded context.
// package repositories

import { InjectionToken } from '@angular/core';
import { Employee } from '../model/aggregates/employee';
import { BirthDate } from '../model/value-objects/birth-date';
import { DNI } from '../model/value-objects/dni';
import { EmployeeId } from '../model/value-objects/employee-id';
import { EmployeeStatus } from '../model/value-objects/employee-status';
import { PersonName } from '../model/value-objects/person-name';
import { RegimeId } from '../model/value-objects/regime-id';

/**
 * EmployeePage is a page of a listing.
 *
 * The pagination is by keyset, so the cursor is opaque and it points to the
 * next position of the order.
 */
export interface EmployeePage<T> {
  /** The employees of the page. It is never empty by contract. */
  readonly items: readonly T[];
  /** The opaque cursor of the next page, when it exists. */
  readonly nextCursor: string | null;
}

/**
 * EmployeeCriteria are the filters of the listing of the employees.
 */
export interface EmployeeCriteria {
  /** The prefix searched in the names and the exact value searched in the DNI. */
  readonly search?: string;
  /** The state the employees are filtered by. */
  readonly status?: EmployeeStatus;
  /** The size of the page. */
  readonly limit?: number;
  /** The opaque cursor of the previous page. */
  readonly cursor?: string;
}

/**
 * NewEmployee is the worker that a worker of the application asks to
 * register.
 */
export interface NewEmployee {
  readonly firstName: PersonName;
  readonly lastName: PersonName;
  readonly dni: DNI;
  readonly regimeId: RegimeId;
  readonly birthDate: BirthDate;
}

/**
 * EmployeeChanges are the changes of a worker that the platform accepts.
 */
export interface EmployeeChanges {
  /** The identifier of the worker. */
  readonly id: EmployeeId;
  /** The new first name of the worker. */
  readonly firstName: PersonName;
  /** The new last name of the worker. */
  readonly lastName: PersonName;
  /** The new identity document of the worker. */
  readonly dni: DNI;
  /** The new labor regime of the worker. */
  readonly regimeId: RegimeId;
  /** The new date of birth of the worker. */
  readonly birthDate: BirthDate;
}

/**
 * EmployeeRepository is the port of the registry of the employees.
 */
export interface EmployeeRepository {
  listEmployees(criteria: EmployeeCriteria): Promise<EmployeePage<Employee>>;
  createEmployee(employee: NewEmployee): Promise<Employee>;
  updateEmployee(changes: EmployeeChanges): Promise<Employee>;
  deleteEmployee(id: EmployeeId): Promise<void>;
}

/** The token of the registry of the employees. */
export const EMPLOYEE_REPOSITORY = new InjectionToken<EmployeeRepository>('EMPLOYEE_REPOSITORY');
