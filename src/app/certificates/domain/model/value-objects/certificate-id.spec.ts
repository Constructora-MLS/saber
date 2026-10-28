import { describe, expect, it } from 'vitest';
import { CertificateValidationError } from '../errors/certificate-errors';
import { createCertificateId, restoreCertificateId } from './certificate-id';

describe('identificador de certificado', () => {
  it('valida y normaliza un UUID', () => {
    expect(createCertificateId('  123e4567-e89b-12d3-a456-426614174000  ')).toBe(
      '123e4567-e89b-12d3-a456-426614174000',
    );
  });

  it('rechaza un UUID con formato inválido', () => {
    expect(() => createCertificateId('not-a-uuid')).toThrow(CertificateValidationError);
  });

  it('restaura un identificador previamente validado', () => {
    expect(restoreCertificateId('backend-id')).toBe('backend-id');
  });
});
