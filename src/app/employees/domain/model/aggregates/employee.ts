// Package aggregates holds the aggregate roots of the Employees bounded
// context.
// package aggregates

import { DNI } from '../value-objects/dni';
import { EmployeeId } from '../value-objects/employee-id';
import { EmployeeStatus } from '../value-objects/employee-status';
import { PersonName } from '../value-objects/person-name';
import { RegimeId } from '../value-objects/regime-id';

/**
 * Employee is the aggregate root of a worker of the platform.
 *
 * The regime of the employee is a reference to the Catalog bounded context:
 * the aggregate keeps the reference and never the model of the regime.
 */
export class Employee {
  private constructor(
    readonly id: EmployeeId,
    readonly firstName: PersonName,
    readonly lastName: PersonName,
    readonly dni: DNI,
    readonly regimeId: RegimeId,
    readonly status: EmployeeStatus,
  ) {}

  /**
   * create builds the employee that the platform accepted.
   */
  static create(
    id: EmployeeId,
    firstName: PersonName,
    lastName: PersonName,
    dni: DNI,
    regimeId: RegimeId,
    status: EmployeeStatus,
  ): Employee {
    return new Employee(id, firstName, lastName, dni, regimeId, status);
  }

  /**
   * restore rebuilds the employee from its published representation.
   */
  static restore(
    id: EmployeeId,
    firstName: PersonName,
    lastName: PersonName,
    dni: DNI,
    regimeId: RegimeId,
    status: EmployeeStatus,
  ): Employee {
    return new Employee(id, firstName, lastName, dni, regimeId, status);
  }

  /**
   * fullName returns the name of the worker as it is shown in the listings.
   */
  get fullName(): string {
    return `${this.firstName.value} ${this.lastName.value}`;
  }
}
