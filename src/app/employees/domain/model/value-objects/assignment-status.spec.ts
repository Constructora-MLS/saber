import { describe, expect, it } from 'vitest';
import { assignmentStatusLabel, FILTERABLE_ASSIGNMENT_STATUSES } from './assignment-status';

describe('assignmentStatusLabel', () => {
  it('escribe el estado vigente en el idioma de las interfaces', () => {
    expect(assignmentStatusLabel('VIGENTE')).toBe('Vigente');
  });

  it('escribe el estado retirado en el idioma de las interfaces', () => {
    expect(assignmentStatusLabel('RETIRADO')).toBe('Retirado');
  });
});

describe('FILTERABLE_ASSIGNMENT_STATUSES', () => {
  it('ofrece solo los estados laborales', () => {
    expect(FILTERABLE_ASSIGNMENT_STATUSES).toEqual(['VIGENTE', 'RETIRADO']);
  });

  it('no ofrece el borrado lógico, porque no es un estado laboral', () => {
    expect(FILTERABLE_ASSIGNMENT_STATUSES).not.toContain('DELETED');
  });
});
