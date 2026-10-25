// Package valueobjects holds the value objects of the Certificates bounded
// context.
// package valueobjects

/**
 * CertificateStatus is the state of an issued certificate.
 *
 * The certificate is immutable: it is never edited, it is only annulled, so
 * the state only tells whether the issuance is still in force.
 */
export type CertificateStatus = 'ISSUED' | 'ANNULLED';

/**
 * CertificateStatusFilter is the state that the search of the certificates
 * is filtered by.
 *
 * The filter has three states: the certificates in force, the certificates
 * that were annulled, and every certificate.
 */
export type CertificateStatusFilter = CertificateStatus | 'ALL';

/**
 * CERTIFICATE_STATUS_FILTER is the filter of the search of the
 * certificates.
 *
 * The search shows the certificates in force by default, because a worker
 * looks for the certificate that certifies the labour period.
 */
export const CERTIFICATE_STATUS_FILTER: readonly CertificateStatusFilter[] = [
  'ISSUED',
  'ANNULLED',
  'ALL',
];

/**
 * certificateStatusLabel returns the label of a state in the language of the
 * interfaces.
 */
export function certificateStatusLabel(status: CertificateStatus): string {
  switch (status) {
    case 'ISSUED':
      return 'Emitido';
    case 'ANNULLED':
      return 'Anulado';
  }
}

/**
 * certificateStatusFilterLabel returns the label of a filter of the search.
 */
export function certificateStatusFilterLabel(filter: CertificateStatusFilter): string {
  switch (filter) {
    case 'ISSUED':
      return 'Emitidos';
    case 'ANNULLED':
      return 'Anulados';
    case 'ALL':
      return 'Todos';
  }
}

/**
 * certificateStatusOf returns the state that the platform filters with.
 *
 * The filter of every certificate is the absence of a state, so the search
 * asks the platform for the certificates it does not filter.
 */
export function certificateStatusOf(filter: CertificateStatusFilter): CertificateStatus | undefined {
  return filter === 'ALL' ? undefined : filter;
}
