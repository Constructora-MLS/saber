import { describe, expect, it } from 'vitest';
import {
  CERTIFICATE_STATUS_FILTER,
  certificateIsInForce,
  certificateStatusFilterLabel,
  certificateStatusLabel,
  certificateStatusOf,
} from './certificate-status';

describe('certificateStatusLabel', () => {
  it('escribe el estado emitido en el idioma de las interfaces', () => {
    expect(certificateStatusLabel('ISSUED')).toBe('Emitido');
  });

  it('escribe el estado anulado en el idioma de las interfaces', () => {
    expect(certificateStatusLabel('ANNULLED')).toBe('Anulado');
  });
});

describe('certificateStatusFilterLabel', () => {
  it('escribe cada filtro del search en el idioma de las interfaces', () => {
    expect(certificateStatusFilterLabel('ISSUED')).toBe('Emitidos');
    expect(certificateStatusFilterLabel('ANNULLED')).toBe('Anulados');
    expect(certificateStatusFilterLabel('ALL')).toBe('Todos');
  });
});

describe('certificateStatusOf', () => {
  it('manda el estado que el search filtra', () => {
    expect(certificateStatusOf('ISSUED')).toBe('ISSUED');
    expect(certificateStatusOf('ANNULLED')).toBe('ANNULLED');
  });

  it('no manda estado cuando el search muestra todos los certificados', () => {
    expect(certificateStatusOf('ALL')).toBeUndefined();
  });
});

describe('certificateIsInForce', () => {
  it('dice que un certificado emitido sigue en vigor', () => {
    expect(certificateIsInForce('ISSUED')).toBe(true);
  });

  it('dice que un certificado anulado ya no está en vigor', () => {
    expect(certificateIsInForce('ANNULLED')).toBe(false);
  });
});

describe('CERTIFICATE_STATUS_FILTER', () => {
  it('ofrece los tres filtros del search, con los emitidos primero', () => {
    expect(CERTIFICATE_STATUS_FILTER).toEqual(['ISSUED', 'ANNULLED', 'ALL']);
  });
});
