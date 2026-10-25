// Package valueobjects holds the value objects of the Certificates bounded
// context.
// package valueobjects

/**
 * todayAsCertificateDate writes the current UTC day in the format of the
 * platform.
 *
 * The platform stamps a certificate with the UTC business day of its
 * issuance, so the preview of a certificate shows the day that the PDF
 * will carry.
 */
export function todayAsCertificateDate(): string {
  return new Date().toISOString().slice(0, 10);
}
