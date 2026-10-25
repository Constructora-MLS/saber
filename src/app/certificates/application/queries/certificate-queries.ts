// Package queries holds the queries of the Certificates bounded context.
//
// The queries describe what the interfaces read, never how the platform
// answers it.
// package queries

import { Certificate } from '../../domain/model/aggregates/certificate';
import { EligibleAssignment } from '../../domain/repositories/certificate-repositories';

/**
 * CertificateQueueItem is an assignment of the queue and the certificates
 * that were issued for it.
 *
 * The history of the assignment travels with it, so the interfaces know
 * which assignments are still waiting for a certificate without asking the
 * platform twice.
 */
export interface CertificateQueueItem {
  /** The assignment that may receive a certificate. */
  readonly assignment: EligibleAssignment;
  /** The certificates that were issued for the assignment. */
  readonly certificates: readonly Certificate[];
}

/**
 * CertificateQueue is the queue of the assignments that may receive a
 * certificate.
 */
export interface CertificateQueue {
  readonly items: readonly CertificateQueueItem[];
}

/**
 * CertificateDraft is the certificate that is about to be issued.
 *
 * It carries the data of the worker and the assignment and the certificates
 * that the assignment already has, so the interfaces can show the
 * certificate before it exists.
 */
export interface CertificateDraft {
  /** The assignment that receives the certificate. */
  readonly assignment: EligibleAssignment;
  /** The name of the service, when the catalog answered. */
  readonly serviceName: string | null;
  /** The certificates that were already issued for the assignment. */
  readonly certificates: readonly Certificate[];
}
