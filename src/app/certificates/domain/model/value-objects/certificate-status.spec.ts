import { describe, expect, it } from 'vitest';
import { certificateStatusLabel } from './certificate-status';

describe('certificateStatusLabel', () => {
  it('escribe el estado emitido en el idioma de las interfaces', () => {
    expect(certificateStatusLabel('ISSUED')).toBe('Emitido');
  });

  it('escribe el estado anulado en el idioma de las interfaces', () => {
    expect(certificateStatusLabel('ANNULLED')).toBe('Anulado');
  });
});
