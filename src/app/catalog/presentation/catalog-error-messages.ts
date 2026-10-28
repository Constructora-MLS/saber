import { CatalogApiError } from '../infrastructure/errors/catalog-api.error';

const CATALOG_API_MESSAGES: Readonly<Record<string, string>> = {
  database_unavailable: 'La base de datos no está disponible. Inténtalo nuevamente en unos instantes.',
  invalid_ids: 'Los identificadores enviados no son válidos.',
  invalid_limit: 'El límite de registros solicitado no es válido.',
  invalid_page: 'La página solicitada no es válida.',
  invalid_search: 'El texto de búsqueda no es válido.',
  invalid_status: 'El estado solicitado no es válido.',
  invalid_uuid: 'El identificador del registro no es válido.',
  not_found: 'El registro ya no existe o no está disponible.',
  service_in_use: 'No se puede eliminar el servicio porque tiene unidades de trabajo asociadas.',
  service_inactive: 'No se puede asignar una unidad de trabajo a un servicio inactivo.',
  service_not_found: 'El servicio seleccionado ya no está disponible.',
  validation_error: 'Revisa los datos ingresados e inténtalo nuevamente.',
  work_unit_code_already_exists: 'El código de la unidad de trabajo ya está en uso.',
  regime_in_use: 'No se puede eliminar el régimen porque está asignado a empleados.',
};

/** catalogApiErrorMessage provides Spanish user-facing messages for catalog API failures. */
export function catalogApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof CatalogApiError)) {
    return fallback;
  }
  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Verifica la conexión e inténtalo nuevamente.';
  }
  return (
    CATALOG_API_MESSAGES[error.code] ??
    (error.status >= 500
      ? 'El servicio de catálogos no está disponible. Inténtalo nuevamente en unos instantes.'
      : 'No se pudo completar la operación. Inténtalo nuevamente.')
  );
}

/** catalogFieldErrors reads only field messages declared by the API problem. */
export function catalogFieldErrors(
  error: unknown,
  fields: readonly string[],
): Readonly<Record<string, string>> {
  if (!(error instanceof CatalogApiError)) {
    return {};
  }
  return Object.fromEntries(
    fields.flatMap((field) => {
      const message = error.messageOfField(field);
      return message === null ? [] : [[field, message]];
    }),
  );
}
