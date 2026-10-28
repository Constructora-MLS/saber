// Package queries holds the queries of the Certificates bounded context.
//
// The queries describe what the interfaces read, never how the platform
// answers it.
// package queries

import { CertificateStatus } from '../../domain/model/value-objects/certificate-status';
import { CertificateSnapshot } from '../../domain/model/value-objects/certificate-snapshot';

/**
 * EligibleAssignment is an assignment whose labour period is closed and
 * that may receive a certificate.
 */
export interface EligibleAssignment {
  readonly assignmentId: string;
  readonly serviceId: string;
  readonly endDate: string;
  readonly snapshot: CertificateSnapshot;
}

/**
 * ServiceTemplate is the editable text of the certificate of a service.
 */
export interface ServiceTemplate {
  readonly serviceId: string;
  readonly body: string;
  readonly tokens: readonly string[];
}

/**
 * ListingCriteria are the pagination of a listing.
 */
export interface ListingPage<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface ListingCriteria {
  readonly search?: string;
  readonly serviceId?: string;
  readonly limit?: number;
  readonly page?: number;
}

export interface CertificateCriteria {
  readonly search?: string;
  readonly limit?: number;
  readonly page?: number;
  readonly workUnitCode?: string;
  readonly status?: CertificateStatus;
}

/**
 * CertificateQueueItem is an assignment still waiting for a certificate.
 * Eligibility and issuance status are filtered by the platform before pagination.
 */
export interface CertificateQueueItem {
  /** The assignment that may receive a certificate. */
  readonly assignment: EligibleAssignment;
}

/**
 * CertificateQueue is the queue of the assignments that may receive a
 * certificate.
 */
export type CertificateQueue = ListingPage<CertificateQueueItem>;

/**
 * ListCertificatesQuery asks for the certificates of the platform.
 *
 * The state is the filter of the search: the certificates in force, the
 * certificates that were annulled, or every certificate.
 */
export interface ListCertificatesQuery {
  readonly workUnitCode?: string;
  readonly search?: string;
  /**
   * The state the certificates are filtered by.
   *
   * It is absent when the search shows every certificate.
   */
  readonly status?: CertificateStatus;
  /** The size of the page of the listing. */
  readonly limit?: number;
  /** The number of the requested page, starting at one. */
  readonly page?: number;
}
