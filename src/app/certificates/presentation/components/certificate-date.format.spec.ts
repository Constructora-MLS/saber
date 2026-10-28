import { describe, expect, it } from 'vitest';
import { formatCertificateDate } from './certificate-date.format';

describe('formatCertificateDate', () => {
  it('escribe la fecha de la plataforma en el idioma de las interfaces', () => {
    expect(formatCertificateDate('2026-10-24')).toBe('24 oct 2026');
  });

  it('escribe el día de un momento de la plataforma', () => {
    expect(formatCertificateDate('2026-10-24T01:47:33Z')).toBe('24 oct 2026');
  });

  it('devuelve el texto tal como está cuando no es una fecha', () => {
    expect(formatCertificateDate('sin fecha')).toBe('sin fecha');
  });
});
