// Package commands holds the commands of the Certificates bounded context.
//
// The commands describe what the worker asks for, never how the platform
// answers it.
// package commands

/**
 * IssueCertificateCommand asks for the certificate of an assignment whose
 * labour period is closed.
 */
export interface IssueCertificateCommand {
  /** The assignment that receives the certificate. */
  readonly assignmentId: string;
}

/**
 * SaveServiceTemplateCommand asks for the replacement of the template of a
 * service.
 */
export interface SaveServiceTemplateCommand {
  /** The service whose template is replaced. */
  readonly serviceId: string;
  /** The new text of the template. */
  readonly body: string;
}

/**
 * RestoreServiceTemplateCommand asks for the template of a service to be
 * replaced with the default one of the platform.
 */
export interface RestoreServiceTemplateCommand {
  /** The service whose template is restored. */
  readonly serviceId: string;
}

/**
 * AnnulCertificateCommand asks for the annulment of an issued certificate.
 *
 * The annulment is the way of correcting a certificate that was issued by
 * mistake: the history and the file of the issuance are kept.
 */
export interface AnnulCertificateCommand {
  /** The certificate that is annulled. */
  readonly certificateId: string;
  /** The reason of the annulment. */
  readonly reason: string;
}
