import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_PASSWORD_MAX_LENGTH,
  ACCOUNT_PASSWORD_MIN_LENGTH,
} from '../../domain/model/value-objects/password';
import { AuthApiError } from '../../infrastructure/errors/auth-api.error';
import {
  describePasswordFailure,
  describeRecoveryFailure,
  fieldFailure,
} from './password-failures';

/**
 * The policy of the password belongs to the domain, so the expectation of the
 * spec is built from the same boundaries that the copy uses.
 */
const PASSWORD_POLICY_MESSAGE = `La contraseña debe tener entre ${ACCOUNT_PASSWORD_MIN_LENGTH} y ${ACCOUNT_PASSWORD_MAX_LENGTH} caracteres.`;

describe('describePasswordFailure', () => {
  it('avisa que no se pudo conectar con el servidor', () => {
    const error = new AuthApiError(0, 'unknown_error', 'The server did not answer.');

    expect(describePasswordFailure(error)).toBe(
      'No se pudo conectar con el servidor. Verifica que el servidor esté activo e inténtalo nuevamente.',
    );
  });

  it('avisa que la plataforma rechazó la petición', () => {
    const error = new AuthApiError(400, 'invalid_request', 'The request is not valid.');

    expect(describePasswordFailure(error)).toBe(
      'Revisa los datos ingresados e inténtalo nuevamente.',
    );
  });

  it('muestra la política de la contraseña que la plataforma rechazó', () => {
    const error = new AuthApiError(400, 'validation_error', 'The password is not valid.', [
      { field: 'password', message: 'The password is too short.' },
    ]);

    expect(describePasswordFailure(error)).toBe(PASSWORD_POLICY_MESSAGE);
  });

  it('avisa que el enlace ya no sirve', () => {
    const error = new AuthApiError(404, 'password_reset_not_found', 'The token does not exist.');

    expect(describePasswordFailure(error)).toBe('El enlace venció o ya fue usado.');
  });

  it('avisa que el servicio no está disponible', () => {
    const error = new AuthApiError(503, 'identity_store_unavailable', 'The store is down.');

    expect(describePasswordFailure(error)).toBe(
      'El servicio no está disponible. Inténtalo nuevamente en unos instantes.',
    );
  });

  it('avisa que el servicio falló', () => {
    const error = new AuthApiError(500, 'internal_error', 'The service failed.');

    expect(describePasswordFailure(error)).toBe(
      'El servicio no está disponible. Inténtalo nuevamente en unos instantes.',
    );
  });

  it('avisa que no se pudo completar la operación cuando la falla no es de la plataforma', () => {
    expect(describePasswordFailure(new Error('boom'))).toBe(
      'No se pudo completar la operación. Inténtalo nuevamente.',
    );
    expect(describePasswordFailure(null)).toBe(
      'No se pudo completar la operación. Inténtalo nuevamente.',
    );
  });

  it('avisa que no se pudo completar la operación cuando la falla no se conoce', () => {
    const error = new AuthApiError(418, 'teapot', 'The service is a teapot.');

    expect(describePasswordFailure(error)).toBe(
      'No se pudo completar la operación. Inténtalo nuevamente.',
    );
  });
});

describe('describeRecoveryFailure', () => {
  it('responde lo mismo cuando la plataforma no encontró la cuenta', () => {
    const missingAccount = new AuthApiError(404, 'user_not_found', 'The account does not exist.');
    const missingLink = new AuthApiError(
      404,
      'password_reset_not_found',
      'The token does not exist.',
    );

    const message = describeRecoveryFailure(missingAccount);

    expect(message).toBe(describeRecoveryFailure(missingLink));
    expect(message).toBe('No se pudo completar la operación. Inténtalo nuevamente.');
  });

  it('no dice que el enlace venció o ya fue usado', () => {
    const error = new AuthApiError(404, 'password_reset_not_found', 'The token does not exist.');

    const message = describeRecoveryFailure(error);

    expect(message).not.toContain('enlace');
    expect(message).not.toContain('venció');
    expect(message).not.toContain('usado');
  });

  it('avisa que no se pudo conectar con el servidor', () => {
    const error = new AuthApiError(0, 'unknown_error', 'The server did not answer.');

    expect(describeRecoveryFailure(error)).toBe(
      'No se pudo conectar con el servidor. Verifica que el servidor esté activo e inténtalo nuevamente.',
    );
  });

  it('avisa que el servicio no está disponible', () => {
    const error = new AuthApiError(503, 'identity_store_unavailable', 'The store is down.');

    expect(describeRecoveryFailure(error)).toBe(
      'El servicio no está disponible. Inténtalo nuevamente en unos instantes.',
    );
  });

  it('responde lo mismo ante una falla que no es de la plataforma', () => {
    expect(describeRecoveryFailure(new Error('boom'))).toBe(
      'No se pudo completar la operación. Inténtalo nuevamente.',
    );
    expect(describeRecoveryFailure(null)).toBe(
      'No se pudo completar la operación. Inténtalo nuevamente.',
    );
  });
});

describe('fieldFailure', () => {
  it('devuelve el mensaje de la contraseña que la plataforma rechazó', () => {
    const error = new AuthApiError(400, 'validation_error', 'The password is not valid.', [
      { field: 'password', message: 'The password is too short.' },
    ]);

    expect(fieldFailure(error, ['password'])).toBe(PASSWORD_POLICY_MESSAGE);
  });

  it('devuelve el mensaje del correo que la plataforma rechazó', () => {
    const error = new AuthApiError(400, 'validation_error', 'The email is not valid.', [
      { field: 'email', message: 'The email is not valid.' },
    ]);

    expect(fieldFailure(error, ['email'])).toBe('El correo electrónico no es válido.');
  });

  it('devuelve un mensaje genérico cuando la plataforma rechazó un campo que la copia no conoce', () => {
    const error = new AuthApiError(400, 'validation_error', 'The name is not valid.', [
      { field: 'name', message: 'The name is not valid.' },
    ]);

    expect(fieldFailure(error, ['name'])).toBe('Revisa los datos ingresados.');
  });

  it('no devuelve un mensaje cuando la plataforma no rechazó ninguno de los campos', () => {
    const error = new AuthApiError(400, 'validation_error', 'The password is not valid.', [
      { field: 'password', message: 'The password is too short.' },
    ]);

    expect(fieldFailure(error, ['email'])).toBeNull();
  });

  it('no devuelve un mensaje cuando la falla no es de la plataforma', () => {
    expect(fieldFailure(new Error('boom'), ['password'])).toBeNull();
    expect(fieldFailure(null, ['password'])).toBeNull();
  });
});
