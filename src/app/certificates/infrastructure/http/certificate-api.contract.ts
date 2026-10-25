// Package http holds the contracts of the HTTP API of the Certificates
// bounded context.
//
// The types mirror the published OpenAPI contract of the platform, so the
// frontend consumes the same contract that the backend documents.
// package http

/**
 * The state of a certificate as it is published by the API.
 */
export type CertificateStatusResource = 'ISSUED' | 'ANNULLED';

/**
 * The data of the worker and the assignment, as the certificate archives it.
 *
 * The names of the fields are the ones that the platform publishes.
 */
export interface CertificateSnapshotResource {
  readonly 'employee.firstName': string;
  readonly 'employee.lastName': string;
  readonly 'employee.paternalSurname'?: string;
  readonly 'employee.maternalSurname'?: string;
  readonly 'employee.dni': string;
  readonly 'assignment.position': string;
  readonly 'assignment.workUnit': string;
  readonly 'assignment.workUnitCode': string;
  readonly 'assignment.startDate': string;
  readonly 'assignment.endDate': string;
  readonly issueDate?: string;
}

/**
 * The representation of an issued certificate.
 *
 * The identifier of the certificate is internal: the platform never prints
 * it and the interfaces never show it.
 */
export interface CertificateResource {
  readonly id: string;
  /** The assignment the certificate was issued for. */
  readonly assignmentId: string;
  /** The service whose template the certificate used. */
  readonly serviceId: string;
  readonly status: CertificateStatusResource;
  /** The template of the service, as it was when the certificate was issued. */
  readonly templateSnapshot: string;
  /** The data of the worker and the assignment, as they were issued. */
  readonly dataSnapshot: CertificateSnapshotResource;
  /** The moment the certificate was issued, in the RFC 3339 format. */
  readonly issuedAt: string;
  /** The moment the certificate was annulled, when it was. */
  readonly annulledAt?: string;
  /** The reason of the annulment, when the certificate was annulled. */
  readonly annulmentReason?: string;
  /** The certificate that this one replaces, when it is a reissue. */
  readonly replacementOf?: string;
}

/**
 * A list of certificates.
 */
export interface CertificateListResource {
  readonly items: readonly CertificateResource[];
}

/**
 * An assignment that may receive a certificate.
 */
export interface EligibleAssignmentResource {
  readonly ID: string;
  readonly ServiceID: string;
  readonly EndDate: string;
  readonly Data: CertificateSnapshotResource;
}

/**
 * The queue of the assignments that may receive a certificate.
 */
export interface EligibleAssignmentListResource {
  readonly items: readonly EligibleAssignmentResource[];
}

/**
 * The template of a service.
 *
 * The tokens are the vocabulary that the platform accepts in the body of
 * the template.
 */
export interface ServiceTemplateResource {
  readonly serviceId: string;
  readonly body: string;
  readonly tokens: readonly string[];
}

/**
 * The body of the issuance of a certificate.
 */
export interface IssueCertificateRequest {
  readonly assignmentId: string;
}

/**
 * The body of the annulment of a certificate.
 */
export interface AnnulCertificateRequest {
  readonly reason: string;
}

/**
 * The invalid field of a failed request.
 */
export interface FieldErrorResource {
  readonly field?: string;
  readonly message?: string;
}

/**
 * The RFC 9457 representation of a failure of the API.
 */
export interface ProblemResource {
  readonly type?: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly code?: string;
  readonly errors?: readonly FieldErrorResource[];
}
