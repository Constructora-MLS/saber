// Package valueobjects holds the value objects of the Certificates bounded
// context.
//
// Certificate identifiers are opaque UUIDs. The branded type prevents
// accidental mixing with other strings while keeping the value frictionless
// for forms and HTTP contracts.
// package valueobjects

import { CertificateValidationError } from '../errors/certificate-errors';

/** UUID_PATTERN is the shape of an identifier published by the platform. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CertificateId = string & { readonly __brand: 'CertificateId' };

/** createCertificateId validates a certificate UUID and trims its input. */
export function createCertificateId(raw: string): CertificateId {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new CertificateValidationError('id', 'El identificador del certificado es obligatorio.');
  }
  if (!UUID_PATTERN.test(trimmed)) {
    throw new CertificateValidationError('id', 'El identificador del certificado no es válido.');
  }
  return trimmed as CertificateId;
}

/** restoreCertificateId trusts the UUID already validated at the API boundary. */
export function restoreCertificateId(value: string): CertificateId {
  return value as CertificateId;
}
