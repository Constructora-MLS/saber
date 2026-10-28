import { describe, expect, it } from 'vitest';

import {
  ApiError,
  FALLBACK_ERROR_DETAIL,
  parseProblem,
  UNEXPECTED_ERROR_CODE,
  UNEXPECTED_ERROR_DETAIL,
  UNKNOWN_ERROR_CODE,
} from './problem';

describe('parseProblem', () => {
  it('rejects a body that is not an object', () => {
    expect(parseProblem(null)).toBeNull();
    expect(parseProblem('error')).toBeNull();
    expect(parseProblem(42)).toBeNull();
    expect(parseProblem(undefined)).toBeNull();
  });

  it('rejects a body without the contract of the problem details', () => {
    expect(parseProblem({})).toBeNull();
    expect(parseProblem({ status: 500 })).toBeNull();
    expect(parseProblem({ errors: [] })).toBeNull();
  });

  it('reads the problem details of a failed response', () => {
    const problem = parseProblem({
      type: 'https://httpstatuses.io/409',
      title: 'Conflict',
      status: 409,
      detail: 'The certificate conflicts with the current state.',
      code: 'certificate_conflict',
      errors: [{ field: 'assignmentId', message: 'The assignment is not eligible.' }],
    });

    expect(problem?.code).toBe('certificate_conflict');
    expect(problem?.detail).toBe('The certificate conflicts with the current state.');
    expect(problem?.title).toBe('Conflict');
    expect(problem?.status).toBe(409);
    expect(problem?.errors).toHaveLength(1);
    expect(problem?.errors?.[0]?.field).toBe('assignmentId');
  });

  it('reads a problem details without a detail', () => {
    const problem = parseProblem({ title: 'Conflict', code: 'certificate_conflict' });

    expect(problem?.code).toBe('certificate_conflict');
    expect(problem?.detail).toBeUndefined();
  });
});

describe('ApiError', () => {
  it('keeps the status, the code, the detail and the invalid fields', () => {
    const error = new ApiError(409, 'certificate_conflict', 'The certificate conflicts.');

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(409);
    expect(error.code).toBe('certificate_conflict');
    expect(error.detail).toBe('The certificate conflicts.');
    expect(error.message).toBe('The certificate conflicts.');
    expect(error.fieldErrors).toEqual([]);
  });

  it('returns the message published for an invalid field', () => {
    const error = new ApiError(400, 'validation_error', 'The request is invalid.', [
      { field: 'name', message: 'The name is required.' },
    ]);

    expect(error.messageOfField('name')).toBe('The name is required.');
  });

  it('returns null when the platform did not reject the field', () => {
    const error = new ApiError(400, 'validation_error', 'The request is invalid.', [
      { field: 'name', message: 'The name is required.' },
    ]);

    expect(error.messageOfField('description')).toBeNull();
    expect(new ApiError(400, 'validation_error', 'x').messageOfField('name')).toBeNull();
  });
});

describe('the shared messages of a failure', () => {
  it('publishes a code and a message for every kind of failure', () => {
    expect(UNEXPECTED_ERROR_CODE).toBe('unexpected_error');
    expect(UNKNOWN_ERROR_CODE).toBe('unknown_error');
    expect(UNEXPECTED_ERROR_DETAIL).toBe('No se pudo completar la operación. Inténtalo nuevamente.');
    expect(FALLBACK_ERROR_DETAIL).toBe('No se pudo completar la operación.');
  });
});
