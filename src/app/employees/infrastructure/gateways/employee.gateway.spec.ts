import '@angular/compiler';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injector, runInInjectionContext } from '@angular/core';
import { throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { API_BASE_URL } from '../../../api.config';
import { EmployeeId } from '../../domain/model/value-objects/employee-id';
import { EmployeeGateway } from './employee.gateway';

describe('EmployeeGateway.findEmployee', () => {
  function setup(status: number, error: object = {}) {
    const injector = Injector.create({ providers: [
      { provide: API_BASE_URL, useValue: '/api/v1' },
      { provide: HttpClient, useValue: { get: () => throwError(() => new HttpErrorResponse({ status, error })) } },
    ] });
    return runInInjectionContext(injector, () => new EmployeeGateway());
  }

  it('returns null when the employee does not exist', async () => {
    await expect(setup(404).findEmployee(EmployeeId.restore('employee-1'))).resolves.toBeNull();
  });

  it.each([500, 0])('rejects HTTP/network status %i', async (status) => {
    await expect(setup(status).findEmployee(EmployeeId.restore('employee-1'))).rejects.toBeDefined();
  });
});
