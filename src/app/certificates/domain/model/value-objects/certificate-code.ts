// Package valueobjects holds the value objects of the Certificates bounded
// context.
// package valueobjects

import { CertificateValidationError } from '../errors/certificate-errors';

/** The public format that the platform publishes for a certificate code. */
const CODE_PATTERN = /^MLS-[0-9A-HJKMNP-TV-Z]{10}$/;

/** CertificateCode is the human-readable public identity of an issuance. */
export type CertificateCode = string & { readonly __brand: 'CertificateCode' };

/** createCertificateCode validates and normalizes a public certificate code. */
export function createCertificateCode(raw: string): CertificateCode {
  const normalized = raw.trim().toUpperCase();
  if (!CODE_PATTERN.test(normalized)) {
    throw new CertificateValidationError('code', 'El código del certificado no es válido.');
  }
  return normalized as CertificateCode;
}

/** restoreCertificateCode trusts a code already validated by the platform. */
export function restoreCertificateCode(value: string): CertificateCode {
  return value as CertificateCode;
}
