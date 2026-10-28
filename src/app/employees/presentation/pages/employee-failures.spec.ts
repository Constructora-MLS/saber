import { describe, expect, it } from 'vitest';
import { EmployeeApiError } from '../../infrastructure/errors/employee-api.error';
import { AssignmentApiError } from '../../infrastructure/errors/assignment-api.error';
import {
  describeAssignmentFailure,
  describeEmployeeFailure,
  employeeFieldFailure,
} from './employee-failures';

describe('employee-failures', () => {
  it('localizes known employee API codes instead of showing server detail', () => {
    const failure = describeEmployeeFailure(
      new EmployeeApiError(409, 'dni_already_exists', 'The DNI is already in use.'),
    );

    expect(failure.message).toBe('El DNI ya está registrado por otro trabajador.');
  });

  it('uses the reported field error to show a localized field message', () => {
    const error = new AssignmentApiError(400, 'validation_error', 'Validation error', [
      { field: 'startDate', message: 'The start date cannot be in the future.' },
    ]);

    expect(employeeFieldFailure(error, ['startDate'])).toBe(
      'La fecha de inicio no puede estar en el futuro.',
    );
    expect(describeAssignmentFailure(error).message).toBe(
      'La fecha de inicio no puede estar en el futuro.',
    );
  });

  it('localizes temporary backend failures', () => {
    expect(
      describeAssignmentFailure(
        new AssignmentApiError(503, 'database_unavailable', 'The database is not available.'),
      ).message,
    ).toBe('El servidor no está disponible. Inténtalo nuevamente en unos instantes.');
  });
});
