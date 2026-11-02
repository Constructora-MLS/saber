// Package pages holds the pages of the IAM bounded context.

import { ApiError } from '../../../shared/infrastructure/http/problem';
import {
  ACCOUNT_PASSWORD_MAX_LENGTH,
  ACCOUNT_PASSWORD_MIN_LENGTH,
} from '../../domain/model/value-objects/password';
import { isResetNotFound } from '../../infrastructure/errors/auth-api.error';

/**
 * The message of a password that does not reach the policy of the platform.
 *
 * The policy is the one of the domain, so the copy never writes a number that
 * the domain does not own.
 */
const PASSWORD_POLICY_MESSAGE = `La contraseña debe tener entre ${ACCOUNT_PASSWORD_MIN_LENGTH} y ${ACCOUNT_PASSWORD_MAX_LENGTH} caracteres.`;

/**
 * The neutral message of a failure of the request of a link of recovery.
 *
 * The platform answers the same for every address, so the copy never says
 * whether the account exists: every failure that is not a failure of the
 * connection or of the service publishes this same message.
 */
const NEUTRAL_RECOVERY_MESSAGE = 'No se pudo completar la operación. Inténtalo nuevamente.';

/**
 * The message of an address that the platform rejected.
 */
const EMAIL_MESSAGE = 'El correo electrónico no es válido.';

/**
 * The message of a field that the platform rejected and that the copy does
 * not know.
 */
const GENERIC_FIELD_MESSAGE = 'Revisa los datos ingresados.';

/**
 * The message published for each field that the copy knows.
 */
const FIELD_MESSAGES: Readonly<Record<string, string>> = {
  email: EMAIL_MESSAGE,
  password: PASSWORD_POLICY_MESSAGE,
};

/**
 * describePasswordFailure describes the known outcomes of the recovery of a
 * password in Spanish.
 *
 * The module does not reuse the failures of the accounts: their fallback
 * talks about the loading of the users, and a password that could not be
 * changed is not a listing that could not be read.
 */
export function describePasswordFailure(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'No se pudo completar la operación. Inténtalo nuevamente.';
  }

  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Verifica que el servidor esté activo e inténtalo nuevamente.';
  }

  if (
    error.code === 'database_unavailable' ||
    error.code === 'identity_store_unavailable' ||
    error.status >= 500
  ) {
    return 'El servicio no está disponible. Inténtalo nuevamente en unos instantes.';
  }

  if (isResetNotFound(error)) {
    return 'El enlace venció o ya fue usado.';
  }

  if (error.code === 'validation_error') {
    return fieldFailure(error, ['password', 'email']) ?? GENERIC_FIELD_MESSAGE;
  }

  if (error.code === 'invalid_request') {
    return 'Revisa los datos ingresados e inténtalo nuevamente.';
  }

  return 'No se pudo completar la operación. Inténtalo nuevamente.';
}

/**
 * describeRecoveryFailure describes the failures of the request of a link of
 * recovery in Spanish.
 *
 * The request of a link never reveals whether the account exists, so the
 * function answers the same neutral message for every failure of the
 * platform that is not a failure of the connection or of the service. A 404
 * of the platform is one of those failures: it says nothing about the
 * account, and the copy never turns it into an answer about the account.
 */
export function describeRecoveryFailure(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return NEUTRAL_RECOVERY_MESSAGE;
  }

  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Verifica que el servidor esté activo e inténtalo nuevamente.';
  }

  if (
    error.code === 'database_unavailable' ||
    error.code === 'identity_store_unavailable' ||
    error.status >= 500
  ) {
    return 'El servicio no está disponible. Inténtalo nuevamente en unos instantes.';
  }

  return NEUTRAL_RECOVERY_MESSAGE;
}

/**
 * fieldFailure returns the localized message published for a form, when the
 * platform rejected one of its fields.
 */
export function fieldFailure(error: unknown, fields: readonly string[]): string | null {
  if (!(error instanceof ApiError)) {
    return null;
  }

  for (const field of fields) {
    if (!error.messageOfField(field)) {
      continue;
    }

    return FIELD_MESSAGES[field] ?? GENERIC_FIELD_MESSAGE;
  }

  return null;
}
