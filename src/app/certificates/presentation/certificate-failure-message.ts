import { CertificateApiError } from '../infrastructure/errors/certificate-api.error';

/**
 * certificateFailureMessage turns the published Certificates API outcomes
 * into messages for the Spanish interface without exposing server details.
 */
export function certificateFailureMessage(error: unknown): string {
  if (!(error instanceof CertificateApiError)) {
    return 'Ocurrió un problema inesperado al consultar los certificados. Inténtalo nuevamente.';
  }

  if (error.status === 0) {
    return 'El servicio de certificados no respondió. Verifica que el servidor esté activo e inténtalo nuevamente.';
  }

  switch (error.code) {
    case 'certificate_conflict':
      return 'El periodo laboral ya tiene un certificado vigente o el certificado ya no puede modificarse.';
    case 'document_not_found':
      return 'El archivo del certificado no está disponible. Puede haber sido retirado.';
    case 'storage_unavailable':
      return 'No se pudo acceder al almacenamiento de certificados. Inténtalo nuevamente en unos instantes.';
    case 'database_unavailable':
      return 'El servicio de certificados no está disponible. Inténtalo nuevamente en unos instantes.';
    case 'not_found':
      return 'No se encontró el certificado solicitado. Actualiza la lista e inténtalo nuevamente.';
    case 'invalid_annulment_reason':
      return error.fieldErrors.some(({ field }) => field === 'reason')
        ? 'El motivo de anulación no es válido. Debe tener entre 1 y 500 caracteres.'
        : 'El motivo de anulación no es válido. Revísalo e inténtalo nuevamente.';
    case 'invalid_certificate_code':
      return 'El código del certificado no es válido. Verifica el enlace e inténtalo nuevamente.';
    case 'invalid_template':
      return 'El contenido del certificado no es válido. Revisa las variables disponibles entre llaves.';
    case 'unexpected_error':
      return 'La plataforma no devolvió una respuesta válida. Inténtalo nuevamente en unos instantes.';
    default:
      if (error.status >= 500) {
        return 'El servicio de certificados no está disponible. Inténtalo nuevamente en unos instantes.';
      }
      return 'No se pudo completar la operación de certificados. Revisa los datos e inténtalo nuevamente.';
  }
}
