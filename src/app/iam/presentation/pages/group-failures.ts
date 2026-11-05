import { GroupValidationError } from '../../domain/model/errors/group-errors';

interface GroupApiFailure {
  readonly status: number;
  readonly code: string;
}

function isGroupApiFailure(error: unknown): error is GroupApiFailure {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { status?: unknown }).status === 'number' &&
    typeof (error as { code?: unknown }).code === 'string'
  );
}

/** isGroupConflict identifies a hierarchy conflict without importing infrastructure errors. */
export function isGroupConflict(error: unknown): boolean {
  return isGroupApiFailure(error) && error.status === 409;
}

/** GroupFailureMessage is a failure presented in the language of the worker. */
export interface GroupFailureMessage {
  readonly title: string;
  readonly message: string;
}

/** describeGroupFailure maps domain and API failures to safe Spanish copy. */
export function describeGroupFailure(
  error: unknown,
  fallbackTitle = 'No se pudo completar la operación',
): GroupFailureMessage {
  if (error instanceof GroupValidationError) {
    return { title: 'Revisa los datos del grupo', message: error.reason };
  }
  if (!isGroupApiFailure(error)) {
    return {
      title: fallbackTitle,
      message: 'Ocurrió un problema inesperado. Inténtalo nuevamente.',
    };
  }
  if (error.status === 0) {
    return {
      title: 'No se pudo conectar con el servidor',
      message: 'El servicio de grupos no respondió. Inténtalo nuevamente.',
    };
  }
  if (
    error.code === 'database_unavailable' ||
    error.code === 'identity_store_unavailable' ||
    error.status >= 500
  ) {
    return {
      title: 'El servicio de grupos no está disponible',
      message: 'El servidor no está disponible. Inténtalo nuevamente en unos instantes.',
    };
  }

  const messages: Readonly<Record<string, string>> = {
    forbidden: 'La plataforma rechazó esta operación por los permisos o la jerarquía vigentes.',
    invalid_credentials: 'Tu sesión ya no es válida. Vuelve a iniciar sesión.',
    invalid_request: 'Revisa los datos del grupo e inténtalo nuevamente.',
    validation_error: 'Revisa el nombre y el color del grupo.',
    group_not_found: 'El grupo ya no está disponible.',
    group_deleted: 'El grupo se eliminó en otra sesión. Se actualizó la lista.',
    group_conflict: 'El nombre ya está en uso. Elige otro nombre o actualiza la lista.',
    group_limit_reached:
      'Ya se alcanzó el máximo de 50 grupos activos. Elimina un grupo antes de crear otro.',
    group_order_conflict:
      'El orden cambió en otra sesión. Se actualizó la lista; revisa el orden y vuelve a intentarlo.',
    capability_conflict:
      'La plataforma rechazó el cambio porque quitaría tu capacidad para administrar grupos.',
  };
  return {
    title: fallbackTitle,
    message: messages[error.code] ?? 'No se pudo completar la operación. Inténtalo nuevamente.',
  };
}

/**
 * describeMembershipFailure maps the failures of the memberships to safe
 * Spanish copy.
 *
 * The memberships of a role have their own reasons: the platform protects
 * the owner of the platform and the groups of the account of the
 * administrator, so the copy names those cases instead of the ones of the
 * role itself.
 */
export function describeMembershipFailure(error: unknown): string {
  if (!isGroupApiFailure(error)) {
    return 'Ocurrió un problema inesperado. Inténtalo nuevamente.';
  }
  if (error.status === 0) {
    return 'El servicio de grupos no respondió. Inténtalo nuevamente.';
  }
  if (
    error.code === 'database_unavailable' ||
    error.code === 'identity_store_unavailable' ||
    error.status >= 500
  ) {
    return 'El servidor no está disponible. Inténtalo nuevamente en unos instantes.';
  }

  const messages: Readonly<Record<string, string>> = {
    forbidden:
      'La plataforma rechazó esta operación por los permisos o la jerarquía vigentes.',
    owner_protected: 'El propietario de la plataforma no se puede quitar del rol.',
    group_conflict: 'No se pueden cambiar los roles de tu propia cuenta.',
    capability_conflict:
      'La plataforma rechazó el cambio porque quitaría tu capacidad para administrar los grupos.',
    user_not_found: 'La cuenta ya no está disponible.',
    group_not_found: 'El rol ya no está disponible.',
    user_not_active: 'La cuenta todavía no está activa.',
    invalid_credentials: 'Tu sesión ya no es válida. Vuelve a iniciar sesión.',
  };
  return messages[error.code] ?? 'No se pudo completar la operación. Inténtalo nuevamente.';
}
