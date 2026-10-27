// Package repositories holds the ports of the Employees bounded context.
// package repositories

import { InjectionToken } from '@angular/core';
import { Employee } from '../model/aggregates/employee';
import { DNI } from '../model/value-objects/dni';
import { EmployeeId } from '../model/value-objects/employee-id';
import { FilterableEmployeeStatus } from '../model/value-objects/employee-status';
import { PersonName } from '../model/value-objects/person-name';
import { RegimeId } from '../model/value-objects/regime-id';

/**
 * EmployeePage is a page of a listing.
 *
 * The pagination is by page number, so the worker reaches any page of the
 * listing with a single request.
 */
export interface EmployeePage<T> {
  /** The employees of the page. It is never empty by contract. */
  readonly items: readonly T[];
  /** The number of the page, starting at one. */
  readonly page: number;
  /** The number of pages of the listing. */
  readonly totalPages: number;
  /** The number of records that match the query. */
  readonly total: number;
}

/**
 * EmployeeCriteria are the filters of the listing of the employees.
 */
export interface EmployeeCriteria {
  /** The term searched in the names and in the DNI. */
  readonly search?: string;
  /** The state the employees are filtered by. */
  readonly status?: FilterableEmployeeStatus;
  /** The size of the page. */
  readonly limit?: number;
  /** The number of the requested page, starting at one. */
  readonly page?: number;
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
}

/**
 * EmployeeChanges are the changes of a worker that the platform accepts.
 */
export interface EmployeeChanges {
  /** The identifier of the worker. */
  readonly id: EmployeeId;
  /** The new first name of the worker. Absent when it does not change. */
  readonly firstName?: PersonName;
  /** The new last name of the worker. Absent when it does not change. */
  readonly lastName?: PersonName;
  /** The new identity document of the worker. Absent when it does not change. */
  readonly dni?: DNI;
  /** The new labor regime of the worker. Absent when it does not change. */
  readonly regimeId?: RegimeId;
}

/**
 * EmployeeRepository is the port of the registry of the employees.
 */
export interface EmployeeRepository {
  listEmployees(criteria: EmployeeCriteria): Promise<EmployeePage<Employee>>;
  findEmployee(id: EmployeeId): Promise<Employee | null>;
  createEmployee(employee: NewEmployee): Promise<Employee>;
  updateEmployee(changes: EmployeeChanges): Promise<Employee>;
  deleteEmployee(id: EmployeeId): Promise<void>;
}

/** The token of the registry of the employees. */
export const EMPLOYEE_REPOSITORY = new InjectionToken<EmployeeRepository>('EMPLOYEE_REPOSITORY');
