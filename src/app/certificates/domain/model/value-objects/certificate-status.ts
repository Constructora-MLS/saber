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
