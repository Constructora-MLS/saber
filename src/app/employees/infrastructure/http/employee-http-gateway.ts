// Package http holds the adapter that talks to the API of the Employees
// bounded context.
//
// The gateway is the anti-corruption layer: it translates the published
// contract into the language of the domain.
// package http

import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../api.config';
import {
  CreateEmployeeRequest,
  EmployeePageResource,
  EmployeeResource,
  EmployeeStatusResource,
  UpdateEmployeeRequest,
} from './employee-api.contract';
import { toEmployeeApiError } from './employee-api.error';
import { Employee } from '../../domain/model/aggregates/employee';
import { DNI } from '../../domain/model/value-objects/dni';
import { EmployeeId } from '../../domain/model/value-objects/employee-id';
import { EmployeeStatus } from '../../domain/model/value-objects/employee-status';
import { PersonName } from '../../domain/model/value-objects/person-name';
import { RegimeId } from '../../domain/model/value-objects/regime-id';
import {
  EmployeeChanges,
  EmployeeCriteria,
  EmployeePage,
  EmployeeRepository,
  NewEmployee,
} from '../../domain/repositories/employee-repositories';

/**
 * EmployeeHttpGateway is the adapter of the registry of the employees.
 */
@Injectable()
export class EmployeeHttpGateway implements EmployeeRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * listEmployees returns the page of the workers that matches the criteria.
   */
  async listEmployees(criteria: EmployeeCriteria): Promise<EmployeePage<Employee>> {
    const page = await firstValueFrom(
      this.http
        .get<EmployeePageResource>(`${this.baseUrl}/employees`, { params: this.params(criteria) })
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return {
      items: page.items.map((item) => this.toEmployee(item)),
      page: page.page,
      totalPages: page.totalPages,
      total: page.total,
    };
  }

  /**
   * findEmployee returns the worker of the given identifier.
   *
   * A worker that the platform does not know is answered as an absent one:
   * the record of the assignment is still shown, with the references it
   * knows.
   */
  async findEmployee(id: EmployeeId): Promise<Employee | null> {
    try {
      const resource = await firstValueFrom(
        this.http.get<EmployeeResource>(`${this.baseUrl}/employees/${id.value}`),
      );

      return this.toEmployee(resource);
    } catch {
      return null;
    }
  }

  /**
   * createEmployee registers a worker of the platform.
   */
  async createEmployee(employee: NewEmployee): Promise<Employee> {
    const request: CreateEmployeeRequest = {
      firstName: employee.firstName.value,
      lastName: employee.lastName.value,
      dni: employee.dni.value,
      regimeId: employee.regimeId.value,
    };

    const created = await firstValueFrom(
      this.http
        .post<EmployeeResource>(`${this.baseUrl}/employees`, request)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return this.toEmployee(created);
  }

  /**
   * updateEmployee applies the changes to a worker.
   *
   * Only the fields that changed are sent: the platform keeps the fields
   * that the request does not carry.
   */
  async updateEmployee(changes: EmployeeChanges): Promise<Employee> {
    const request: UpdateEmployeeRequest = {
      ...(changes.firstName ? { firstName: changes.firstName.value } : {}),
      ...(changes.lastName ? { lastName: changes.lastName.value } : {}),
      ...(changes.dni ? { dni: changes.dni.value } : {}),
      ...(changes.regimeId ? { regimeId: changes.regimeId.value } : {}),
    };

    const updated = await firstValueFrom(
      this.http
        .patch<EmployeeResource>(`${this.baseUrl}/employees/${changes.id.value}`, request)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return this.toEmployee(updated);
  }

  /**
   * deleteEmployee logically deletes a worker. The answer of a deletion
   * carries no body.
   */
  async deleteEmployee(id: EmployeeId): Promise<void> {
    await firstValueFrom(
      this.http
        .delete<void>(`${this.baseUrl}/employees/${id.value}`)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

  /**
   * params builds the query string of a listing.
   */
  private params(criteria: EmployeeCriteria): HttpParams {
    let params = new HttpParams();
    if (criteria.search) {
      params = params.set('search', criteria.search);
    }
    if (criteria.status) {
      params = params.set('status', criteria.status);
    }
    if (criteria.limit) {
      params = params.set('limit', criteria.limit);
    }
    if (criteria.page) {
      params = params.set('page', String(criteria.page));
    }
    return params;
  }

  /**
   * toFailure translates a failed response into the error of the context.
   */
  private toFailure(error: HttpErrorResponse) {
    return throwError(() => toEmployeeApiError(error.status, error.error));
  }

  /**
   * toEmployee rebuilds the worker from its published representation.
   */
  private toEmployee(resource: EmployeeResource): Employee {
    return Employee.restore(
      EmployeeId.restore(resource.uuid),
      PersonName.restore(resource.firstName),
      PersonName.restore(resource.lastName),
      DNI.restore(resource.dni),
      RegimeId.restore(resource.regimeId),
      this.status(resource.status),
    );
  }

  /**
   * status reads the state published for a worker.
   *
   * A state that the context does not know is reported as retired, so an
   * unknown state never shows a worker as active.
   */
  private status(raw: EmployeeStatusResource): EmployeeStatus {
    return raw === 'VIGENTE' ? 'VIGENTE' : 'RETIRADO';
  }
}
