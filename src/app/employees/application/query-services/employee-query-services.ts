import { inject, Injectable } from '@angular/core';
import { normalizeEmployeeSearch } from '../queries/employee-search';
import {
  EmployeeCriteria,
  EmployeePage,
  ListEmployeesQuery,
} from '../queries/employee-queries';
import { EmployeeGateway } from '../../infrastructure/gateways/employee.gateway';
import { Employee } from '../../domain/model/aggregates/employee';

@Injectable({ providedIn: 'root' })
export class ListEmployeesQueryService {
  private readonly gateway = inject(EmployeeGateway);

  async execute(query: ListEmployeesQuery): Promise<EmployeePage<Employee>> {
    return this.gateway.listEmployees(this.criteria(query));
  }

  private criteria(query: ListEmployeesQuery): EmployeeCriteria {
    return {
      search: normalizeEmployeeSearch(query.search),
      status: query.status,
      limit: query.limit,
      page: query.page,
    };
  }
}
