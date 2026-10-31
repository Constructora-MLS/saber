// Package pages holds the pages of the IAM bounded context.

import { ApiError } from '../../../shared/infrastructure/http/problem';

/**
 * UserFailureMessage is a failure of the accounts of the platform, written
 * in the language of the interfaces.
 */
export interface UserFailureMessage {
  readonly title: string;
  readonly message: string;
}

/**
 * validationMessage returns the message published for a field, when the
 * platform rejected that field.
 */
function validationMessage(error: ApiError, fields: readonly string[]): string | null {
  for (const field of fields) {
    if (!error.messageOfField(field)) {
      continue;
    }

    if (field === 'email') {
      return 'El correo electrónico no es válido.';
    }
    return 'Revisa los datos ingresados.';
  }
  return null;
}

/**
 * describeUserFailure describes the known outcomes of the accounts of the
 * platform in Spanish.
 */
export function describeUserFailure(error: unknown): UserFailureMessage {
  if (!(error instanceof ApiError)) {
    return {
      title: 'No se pudieron cargar los usuarios',
      message: 'Ocurrió un problema inesperado al consultar los usuarios. Inténtalo nuevamente.',
    };
  }

  if (error.status === 0) {
    return {
      title: 'No se pudo conectar con el servidor',
      message:
        'El servicio de usuarios no respondió. Verifica que el servidor esté activo e inténtalo nuevamente.',
    };
  }
  if (
    error.code === 'database_unavailable' ||
    error.code === 'identity_store_unavailable' ||
    error.status >= 500
  ) {
    return {
      title: 'El servicio de usuarios no está disponible',
      message: 'El servidor no está disponible. Inténtalo nuevamente en unos instantes.',
    };
  }

  const messages: Readonly<Record<string, string>> = {
    user_conflict: 'El correo ya está registrado o tiene una invitación pendiente.',
    invitation_not_found: 'La invitación no es válida, venció o ya fue usada.',
    user_not_found: 'El usuario ya no está disponible.',
    user_not_pending: 'El usuario no está pendiente de activación.',
    invalid_credentials: 'Tu sesión no es válida. Vuelve a iniciar sesión.',
    invalid_request: 'Revisa los datos ingresados e inténtalo nuevamente.',
    invalid_limit: 'La cantidad de registros por página no es válida.',
    invalid_page: 'La página solicitada no es válida.',
    invalid_search: 'La búsqueda debe tener entre 2 y 120 caracteres.',
    invalid_status: 'El estado seleccionado no es válido.',
    validation_error:
      validationMessage(error, ['email']) ?? 'Revisa los datos ingresados e inténtalo nuevamente.',
  };

  const message = messages[error.code];
  return message
    ? { title: 'No se pudo completar la operación', message }
    : {
        title: 'No se pudieron cargar los usuarios',
        message: 'No se pudo completar la operación. Inténtalo nuevamente.',
      };
}

/**
 * userFieldFailure returns the localized field error published for a form,
 * when there is one.
 */
export function userFieldFailure(error: ApiError, fields: readonly string[]): string | null {
  return validationMessage(error, fields);
}
