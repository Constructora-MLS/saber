// Package aggregates holds the aggregate roots of the Certificates bounded
// context.
// package aggregates

import { CertificateCode } from '../value-objects/certificate-code';
import { CertificateId } from '../value-objects/certificate-id';
import { CertificateSnapshot } from '../value-objects/certificate-snapshot';
import { CertificateStatus } from '../value-objects/certificate-status';

/**
 * Certificate is the aggregate root of an issued certificate.
 *
 * A certificate is the immutable record of a work period: it archives the
 * data of the worker and the assignment as they were on the day of the
 * issuance, and it is never edited. It is only annulled, so the state is
 * the only thing that changes over time.
 */
export class Certificate {
  private constructor(
    readonly id: CertificateId,
    /** The public code of the certificate. */
    readonly code: CertificateCode,
    /** The assignment the certificate was issued for. */
    readonly assignmentId: string,
    /** The service whose template the certificate used. */
    readonly serviceId: string,
    readonly status: CertificateStatus,
    /** The data of the worker and the assignment, as they were issued. */
    readonly snapshot: CertificateSnapshot,
    /** The moment the certificate was issued, in the RFC 3339 format. */
    readonly issuedAt: string,
    /** The moment the certificate was annulled, when it was. */
    readonly annulledAt: string | null,
    /** The reason of the annulment, when the certificate was annulled. */
    readonly annulmentReason: string | null,
    /** The certificate that this one replaces, when it is a reissue. */
    readonly replacementOf: string | null,
  ) {}

  /**
   * restore rebuilds the certificate from its published representation.
   */
  static restore(
    id: CertificateId,
    code: CertificateCode,
    assignmentId: string,
    serviceId: string,
    status: CertificateStatus,
    snapshot: CertificateSnapshot,
    issuedAt: string,
    annulledAt: string | null,
    annulmentReason: string | null,
    replacementOf: string | null,
  ): Certificate {
    return new Certificate(
      id,
      code,
      assignmentId,
      serviceId,
      status,
      snapshot,
      issuedAt,
      annulledAt,
      annulmentReason,
      replacementOf,
    );
  }

  /**
   * isIssued reports whether the issuance is still in force.
   *
   * An annulled certificate keeps its history and its file, but it is not a
   * certificate of the work period anymore.
   */
  get isIssued(): boolean {
    return this.status === 'ISSUED';
  }
}
