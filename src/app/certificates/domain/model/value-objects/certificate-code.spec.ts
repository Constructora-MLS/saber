import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { CertificateCode } from './certificate-code';
import { CertificateValidationError } from '../errors/certificate-errors';

describe('código público del certificado', () => {
  it('acepta el código que publica la plataforma', () => {
    const code = CertificateCode.create('MLS-7K9D2Q8M5P');
    expect(code.value).toBe('MLS-7K9D2Q8M5P');
  });

  it('normaliza el código que llega con espacios o minúsculas', () => {
    expect(CertificateCode.create('  mls-7k9d2q8m5p ').value).toBe('MLS-7K9D2Q8M5P');
  });

  it('rechaza un código que no respeta el formato publicado', () => {
    for (const raw of [
      '',
      '7K9D2Q8M5P',
      'MLS-7K9D2Q8M5',
      'MLS-7K9D2Q8M5PP',
      'MLS-7K9D2Q8M5I',
      'MLS-7K9D2Q8M5L',
      'MLS-7K9D2Q8M5O',
      'MLS-7K9D2Q8M5U',
      'XYZ-7K9D2Q8M5P',
    ]) {
      expect(() => CertificateCode.create(raw)).toThrow(CertificateValidationError);
    }
  });
});
