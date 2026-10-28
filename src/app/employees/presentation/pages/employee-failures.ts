import { ApiError } from '../../../shared/infrastructure/http/problem';

/** A localized failure suitable for a page-level loading or mutation state. */
export interface EmployeeFailureMessage {
  readonly title: string;
  readonly message: string;
}

/** Converts known API validation messages into Spanish without exposing raw server details. */
function validationMessage(error: ApiError, fields: readonly string[]): string | null {
  for (const field of fields) {
    const message = error.messageOfField(field);
    if (!message) continue;

    if (field === 'employeeId') return 'Selecciona un trabajador válido.';
    if (field === 'startDate') return 'La fecha de inicio no puede estar en el futuro.';
    if (field === 'date') return 'La fecha de cese no puede ser anterior al inicio de la asignación.';
    if (field === 'dni') return 'El DNI no es válido.';
    if (field === 'regimeId') return 'Selecciona un régimen disponible.';
    if (field === 'firstName' || field === 'lastName') return 'Revisa el nombre ingresado.';
    return 'Revisa los datos ingresados.';
  }
  return null;
}

/** Describes known Employees API outcomes in Spanish. */
export function describeEmployeeFailure(error: unknown): EmployeeFailureMessage {
  if (!(error instanceof ApiError)) {
    return {
      title: 'No se pudo cargar el personal',
      message: 'Ocurrió un problema inesperado al consultar los trabajadores. Inténtalo nuevamente.',
    };
  }

  if (error.status === 0) {
    return {
      title: 'No se pudo conectar con el servidor',
      message: 'El servicio de personal no respondió. Verifica que el servidor esté activo e inténtalo nuevamente.',
    };
  }
  if (error.code === 'database_unavailable' || error.status >= 500) {
    return {
      title: 'El servicio de personal no está disponible',
      message: 'El servidor no está disponible. Inténtalo nuevamente en unos instantes.',
    };
  }

  const messages: Readonly<Record<string, string>> = {
    employee_not_found: 'El trabajador ya no está registrado.',
    not_found: 'El trabajador solicitado ya no está disponible.',
    dni_already_exists: 'El DNI ya está registrado por otro trabajador.',
    regime_not_found: 'El régimen seleccionado ya no está disponible.',
    invalid_uuid: 'El identificador del trabajador no es válido.',
    invalid_request: 'Revisa los datos ingresados e inténtalo nuevamente.',
    validation_error: validationMessage(error, ['dni', 'firstName', 'lastName', 'regimeId']) ??
      'Revisa los datos ingresados e inténtalo nuevamente.',
  };
  const message = messages[error.code];
  return message
    ? { title: 'No se pudo completar la operación', message }
    : { title: 'No se pudo cargar el personal', message: 'No se pudo completar la operación. Inténtalo nuevamente.' };
}

/** Describes known assignment API outcomes in Spanish. */
export function describeAssignmentFailure(error: unknown): EmployeeFailureMessage {
  if (!(error instanceof ApiError)) {
    return {
      title: 'No se pudieron cargar las asignaciones',
      message: 'Ocurrió un problema inesperado al consultar las asignaciones. Inténtalo nuevamente.',
    };
  }

  if (error.status === 0) {
    return {
      title: 'No se pudo conectar con el servidor',
      message: 'El servicio de asignaciones no respondió. Verifica que el servidor esté activo e inténtalo nuevamente.',
    };
  }
  if (error.code === 'database_unavailable' || error.status >= 500) {
    return {
      title: 'El servicio de asignaciones no está disponible',
      message: 'El servidor no está disponible. Inténtalo nuevamente en unos instantes.',
    };
  }

  const messages: Readonly<Record<string, string>> = {
    already_retired: 'La asignación ya fue dada de baja.',
    assignment_certificate_history: 'Anula el certificado y vuelve a intentarlo. El historial se conserva.',
    employee_not_found: 'El trabajador ya no está registrado.',
    work_unit_not_found: 'La unidad de trabajo ya no está disponible. Actualiza la selección.',
    position_not_found: 'El cargo seleccionado ya no está disponible. Actualiza la selección.',
    not_found: 'La asignación solicitada ya no está disponible.',
    invalid_uuid: 'El identificador de la asignación no es válido.',
    invalid_limit: 'La cantidad solicitada no es válida.',
    invalid_page: 'La página solicitada no es válida.',
    invalid_search: 'La búsqueda debe tener entre 2 y 120 caracteres.',
    invalid_status: 'El estado seleccionado no es válido.',
    invalid_request: 'Revisa los datos ingresados e inténtalo nuevamente.',
    validation_error: validationMessage(error, ['employeeId', 'startDate', 'date']) ??
      'Revisa los datos ingresados e inténtalo nuevamente.',
  };
  const message = messages[error.code];
  return message
    ? { title: 'No se pudo completar la operación', message }
    : { title: 'No se pudieron cargar las asignaciones', message: 'No se pudo completar la operación. Inténtalo nuevamente.' };
}

/** Returns the localized field error published for a form, when present. */
export function employeeFieldFailure(error: ApiError, fields: readonly string[]): string | null {
  return validationMessage(error, fields);
}
