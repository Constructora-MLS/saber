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
} from '../contracts/employee.contract';
import { toEmployeeApiError } from '../errors/employee-api.error';
import { Employee } from '../../domain/model/aggregates/employee';
import { DNI } from '../../domain/model/value-objects/dni';
import { EmployeeId } from '../../domain/model/value-objects/employee-id';
import { EmployeeStatus } from '../../domain/model/value-objects/employee-status';
import { PersonName } from '../../domain/model/value-objects/person-name';
import { RegimeId } from '../../domain/model/value-objects/regime-id';
import { EmployeeCriteria, EmployeePage } from '../../application/queries/employee-queries';

export interface NewEmployee {
  readonly firstName: PersonName;
  readonly lastName: PersonName;
  readonly dni: DNI;
  readonly regimeId: RegimeId;
}

export interface EmployeeChanges {
  readonly id: EmployeeId;
  readonly firstName?: PersonName;
  readonly lastName?: PersonName;
  readonly dni?: DNI;
  readonly regimeId?: RegimeId;
}


@Injectable({ providedIn: 'root' })
export class EmployeeGateway {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

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

  async findEmployee(id: EmployeeId): Promise<Employee | null> {
    try {
      const resource = await firstValueFrom(
        this.http.get<EmployeeResource>(`${this.baseUrl}/employees/${id.value}`).pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === 404) {
              return throwError(() => error);
            }
            return this.toFailure(error);
          }),
        ),
      );

      return this.toEmployee(resource);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

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

  async deleteEmployee(id: EmployeeId): Promise<void> {
    await firstValueFrom(
      this.http
        .delete<void>(`${this.baseUrl}/employees/${id.value}`)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );
  }

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

  private toFailure(error: HttpErrorResponse) {
    return throwError(() => toEmployeeApiError(error.status, error.error));
  }

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

  private status(raw: EmployeeStatusResource): EmployeeStatus {
    return raw === 'VIGENTE' ? 'VIGENTE' : 'RETIRADO';
  }
}

export { EmployeeGateway as EmployeeHttpGateway };
