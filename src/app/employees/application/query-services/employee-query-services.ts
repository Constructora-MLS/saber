// Package queryservices holds the use cases that read the state of the
// Employees bounded context.
//
// The listings are served by keyset pagination, so the cursor is opaque and
// it is never composed by the interfaces.
// package queryservices

import { inject, Injectable } from '@angular/core';
import { normalizeEmployeeSearch } from '../queries/employee-search';
import { ListEmployeesQuery } from '../queries/employee-queries';
import {
  EMPLOYEE_REPOSITORY,
  EmployeeCriteria,
  EmployeePage,
} from '../../domain/repositories/employee-repositories';
import { Employee } from '../../domain/model/aggregates/employee';

/**
 * ListEmployeesQueryService returns the page of the workers that matches the
 * query.
 */
@Injectable({ providedIn: 'root' })
export class ListEmployeesQueryService {
  private readonly repository = inject(EMPLOYEE_REPOSITORY);

  async execute(query: ListEmployeesQuery): Promise<EmployeePage<Employee>> {
    return this.repository.listEmployees(this.criteria(query));
  }

  private criteria(query: ListEmployeesQuery): EmployeeCriteria {
    return {
      search: normalizeEmployeeSearch(query.search),
      status: query.status,
      limit: query.limit,
      cursor: query.cursor,
    };
  }
}
