// Package repositories holds the ports of the Certificates bounded context.
// package repositories

import { InjectionToken } from '@angular/core';
import { Certificate } from '../model/aggregates/certificate';
import { CertificateId } from '../model/value-objects/certificate-id';
import { CertificateSnapshot } from '../model/value-objects/certificate-snapshot';
import { CertificateStatus } from '../model/value-objects/certificate-status';

/**
 * EligibleAssignment is an assignment whose labour period is closed and
 * that may receive a certificate.
 *
 * The assignment belongs to the Employees context, so this context keeps
 * only the data that the certificate needs: the identifiers and the copy of
 * the worker and the assignment that the certificate archives.
 */
export interface EligibleAssignment {
  /** The identifier of the assignment. */
  readonly assignmentId: string;
  /** The service whose template the certificate would use. */
  readonly serviceId: string;
  /** The date the labour period was closed, in the RFC 3339 format. */
  readonly endDate: string;
  /** The data of the worker and the assignment, as the certificate sees it. */
  readonly snapshot: CertificateSnapshot;
}

/**
 * ServiceTemplate is the editable text of the certificate of a service.
 *
 * The body is plain text whose placeholders use the names of the
 * vocabulary between curly braces, as in {nombres}.
 */
export interface ServiceTemplate {
  /** The service the template belongs to. */
  readonly serviceId: string;
  /** The text of the template. */
  readonly body: string;
  /** The vocabulary of the templates that the platform accepts. */
  readonly tokens: readonly string[];
}

/**
 * ListingCriteria are the pagination of a listing.
 *
 * The platform answers a page of every listing, so the client asks for the
 * size of the page that it shows.
 */
export interface ListingCriteria {
  /** The size of the page. */
  readonly limit?: number;
  /** The number of the requested page, starting at one. */
  readonly page?: number;
}

/**
 * CertificateCriteria are the filters of the search of the certificates.
 */
export interface CertificateCriteria extends ListingCriteria {
  /**
   * The state the certificates are filtered by.
   *
   * It is absent when the search shows every certificate.
   */
  readonly status?: CertificateStatus;
}

/**
 * CertificateRepository is the port of the registry of the certificates.
 */
export interface CertificateRepository {
  /**
   * listEligibleAssignments returns the assignments whose labour period is
   * closed and that may receive a certificate.
   */
  listEligibleAssignments(criteria?: ListingCriteria): Promise<readonly EligibleAssignment[]>;

  /**
   * listCertificates returns the certificates of the platform that match the
   * criteria.
   *
   * The search of the certificates is filtered by state: the certificates in
   * force, the certificates that were annulled, or every certificate.
   */
  listCertificates(criteria: CertificateCriteria): Promise<readonly Certificate[]>;

  /**
   * issueCertificate issues the certificate of an eligible assignment.
   */
  issueCertificate(assignmentId: string): Promise<Certificate>;

  /**
   * findCertificate reads a certificate, when it exists.
   */
  findCertificate(id: CertificateId): Promise<Certificate | null>;

  /**
   * listAssignmentCertificates returns the issuance history of an
   * assignment, the newest one first.
   */
  listAssignmentCertificates(assignmentId: string): Promise<readonly Certificate[]>;

  /**
   * findServiceTemplate returns the template of a service.
   */
  findServiceTemplate(serviceId: string): Promise<ServiceTemplate>;

  /**
   * saveServiceTemplate replaces the template of a service.
   */
  saveServiceTemplate(serviceId: string, body: string): Promise<ServiceTemplate>;

  /**
   * restoreServiceTemplate replaces the template of a service with the
   * default one of the platform.
   */
  restoreServiceTemplate(serviceId: string): Promise<ServiceTemplate>;

  /**
   * annulCertificate annuls an issued certificate.
   */
  annulCertificate(id: CertificateId, reason: string): Promise<Certificate>;

  /**
   * downloadCertificateFile reads the PDF that the platform archived.
   */
  downloadCertificateFile(id: CertificateId): Promise<Blob>;

  /**
   * previewCertificate renders the certificate of an assignment without
   * archiving it.
   */
  previewCertificate(assignmentId: string): Promise<Blob>;

  /**
   * previewServiceTemplate renders the certificate of a service with a
   * template that is not stored yet.
   */
  previewServiceTemplate(serviceId: string, body: string): Promise<Blob>;
}

/** The token of the registry of the certificates. */
export const CERTIFICATE_REPOSITORY = new InjectionToken<CertificateRepository>(
  'CERTIFICATE_REPOSITORY',
);
