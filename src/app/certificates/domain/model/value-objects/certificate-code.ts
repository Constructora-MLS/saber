// Package valueobjects holds the value objects of the Certificates bounded
// context.
//
// Every value object validates its invariants on construction and never
// exposes a mutable state.
// package valueobjects

import { CertificateValidationError } from '../errors/certificate-errors';

/**
 * CODE_PATTERN is the shape of the public code of a certificate.
 *
 * The code is the identity that the document prints and that the QR of the
 * document carries, so the platform publishes its format.
 */
const CODE_PATTERN = /^MLS-[0-9A-HJKMNP-TV-Z]{10}$/;

/**
 * CertificateCode is the public code of an issued certificate.
 *
 * The code is short enough to be read aloud and to be written by hand, and
 * it never exposes the identifier of the record.
 */
export class CertificateCode {
  private constructor(private readonly text: string) {}

  /**
   * create validates and builds the code of a certificate.
   *
   * The code arrives from the platform and from the interfaces, so a code
   * that does not respect the published format is rejected.
   */
  static create(raw: string): CertificateCode {
    const trimmed = raw.trim().toUpperCase();
    if (!CODE_PATTERN.test(trimmed)) {
      throw new CertificateValidationError(
        'code',
        'El código del certificado no es válido.',
      );
    }
    return new CertificateCode(trimmed);
  }

  /**
   * restore rebuilds a code from its stored value.
   */
  static restore(value: string): CertificateCode {
    return new CertificateCode(value);
  }

  /**
   * value returns the code as it was stored.
   */
  get value(): string {
    return this.text;
  }
}
