// Package valueobjects holds the value objects of the Certificates bounded
// context.
//
// Every value object validates its invariants on construction and never
// exposes a mutable state.
// package valueobjects

import { CertificateSnapshot } from './certificate-snapshot';
import { CertificateStatus } from './certificate-status';

/**
 * CertificateVerification is the public trace of an issued certificate.
 *
 * It carries what a person needs to know that the certificate is genuine:
 * the code, the state, the worker and the period of labour. The identifiers
 * of the record stay internal.
 */
export class CertificateVerification {
  private constructor(
    /** The public code of the certificate. */
    readonly code: string,
    /** The state of the certificate. */
    readonly status: CertificateStatus,
    /** The data of the worker and the labour period, as it was archived. */
    readonly snapshot: CertificateSnapshot,
    /** The moment of the issuance, in the RFC 3339 format. */
    readonly issuedAt: string,
  ) {}

  /**
   * restore rebuilds the trace from its published representation.
   */
  static restore(
    code: string,
    status: CertificateStatus,
    snapshot: CertificateSnapshot,
    issuedAt: string,
  ): CertificateVerification {
    return new CertificateVerification(code, status, snapshot, issuedAt);
  }

  /**
   * isIssued reports whether the certificate is still in force.
   */
  get isIssued(): boolean {
    return this.status === 'ISSUED';
  }
}
