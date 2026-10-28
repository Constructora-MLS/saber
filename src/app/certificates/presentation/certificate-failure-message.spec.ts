import { describe, expect, it } from 'vitest';
import { CertificateApiError } from '../infrastructure/errors/certificate-api.error';
import { certificateFailureMessage } from './certificate-failure-message';

describe('mensajes de errores de certificados', () => {
  it('traduce el campo reason sin revelar el texto técnico del backend', () => {
    const error = new CertificateApiError(400, 'invalid_annulment_reason', 'internal', [
      { field: 'reason', message: 'invalid value' },
    ]);
    expect(certificateFailureMessage(error)).toBe(
      'El motivo de anulación no es válido. Debe tener entre 1 y 500 caracteres.',
    );
  });

  it.each([
    [409, 'certificate_conflict', 'El periodo laboral ya tiene un certificado vigente o el certificado ya no puede modificarse.'],
    [404, 'document_not_found', 'El archivo del certificado no está disponible. Puede haber sido retirado.'],
    [503, 'storage_unavailable', 'No se pudo acceder al almacenamiento de certificados. Inténtalo nuevamente en unos instantes.'],
  ])('traduce %s %s sin mostrar el detalle del servidor', (status, code, expected) => {
    const error = new CertificateApiError(status, code, 'internal English detail');
    const message = certificateFailureMessage(error);
    expect(message).toBe(expected);
    expect(message).not.toContain('internal English detail');
  });
});
