// Package valueobjects holds the value objects of the Certificates bounded
// context.
//
// Every value object validates its invariants on construction and never
// exposes a mutable state.
// package valueobjects

import { CertificateValidationError } from '../errors/certificate-errors';

/**
 * UUID_PATTERN is the shape of the identifier of a record of the platform.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * CertificateId is the identifier of an issued certificate.
 */
export class CertificateId {
  private constructor(private readonly text: string) {}

  /**
   * create validates and builds the identifier of a certificate.
   *
   * The identifier is the identifier of a record of the platform, so it
   * must be a UUID: the platform rejects any other value.
   */
  static create(raw: string): CertificateId {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      throw new CertificateValidationError(
        'id',
        'El identificador del certificado es obligatorio.',
      );
    }
    if (!UUID_PATTERN.test(trimmed)) {
      throw new CertificateValidationError('id', 'El identificador del certificado no es válido.');
    }
    return new CertificateId(trimmed);
  }

  /**
   * restore rebuilds an identifier from its stored value.
   */
  static restore(value: string): CertificateId {
    return new CertificateId(value);
  }

  /**
   * value returns the identifier as it was stored.
   */
  get value(): string {
    return this.text;
  }
}
