import { describe, expect, it } from 'vitest';
import { employeeStatusLabel, FILTERABLE_EMPLOYEE_STATUSES } from './employee-status';

describe('employeeStatusLabel', () => {
  it('escribe el estado vigente en el idioma de las interfaces', () => {
    expect(employeeStatusLabel('VIGENTE')).toBe('Vigente');
  });

  it('escribe el estado retirado en el idioma de las interfaces', () => {
    expect(employeeStatusLabel('RETIRADO')).toBe('Retirado');
  });
});

describe('FILTERABLE_EMPLOYEE_STATUSES', () => {
  it('ofrece solo los estados laborales', () => {
    expect(FILTERABLE_EMPLOYEE_STATUSES).toEqual(['VIGENTE', 'RETIRADO']);
  });

  it('no ofrece el borrado lógico, porque no es un estado laboral', () => {
    expect(FILTERABLE_EMPLOYEE_STATUSES).not.toContain('DELETED');
  });
});
