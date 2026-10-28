import { describe, expect, it } from 'vitest';
import {
  formatAssignmentDate,
  formatAssignmentPeriod,
  todayAsAssignmentDate,
} from './assignment-period.format';

describe('formatAssignmentDate', () => {
  it('escribe la fecha en el idioma de las interfaces', () => {
    expect(formatAssignmentDate('2026-10-15')).toBe('15 oct 2026');
  });

  it('escribe el día con dos dígitos', () => {
    expect(formatAssignmentDate('2026-04-02')).toBe('02 abr 2026');
  });

  it('devuelve el texto recibido cuando la fecha no es de la plataforma', () => {
    expect(formatAssignmentDate('no es una fecha')).toBe('no es una fecha');
  });
});

describe('formatAssignmentPeriod', () => {
  it('anuncia el periodo abierto con "Desde"', () => {
    expect(formatAssignmentPeriod('2026-10-15', null)).toBe('Desde 15 oct 2026');
  });

  it('escribe el año una sola vez cuando las dos fechas son del mismo año', () => {
    expect(formatAssignmentPeriod('2026-04-02', '2026-10-14')).toBe('02 abr – 14 oct 2026');
  });

  it('escribe el año de cada fecha cuando los años son distintos', () => {
    expect(formatAssignmentPeriod('2025-04-02', '2026-10-14')).toBe('02 abr 2025 – 14 oct 2026');
  });
});

describe('todayAsAssignmentDate', () => {
  it('escribe el día de hoy en el formato de la plataforma', () => {
    expect(todayAsAssignmentDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
