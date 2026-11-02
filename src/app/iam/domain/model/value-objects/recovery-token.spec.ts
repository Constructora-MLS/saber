import { describe, expect, it } from 'vitest';
import {
  RECOVERY_TOKEN_MAX_LENGTH,
  RECOVERY_TOKEN_MIN_LENGTH,
  RecoveryToken,
} from './recovery-token';

const aToken = 'a'.repeat(RECOVERY_TOKEN_MIN_LENGTH);

describe('RecoveryToken', () => {
  it('acepta un token dentro de los límites', () => {
    expect(RecoveryToken.create(aToken)).toBe(aToken);
    expect(RecoveryToken.create('a'.repeat(RECOVERY_TOKEN_MAX_LENGTH))).toHaveLength(
      RECOVERY_TOKEN_MAX_LENGTH,
    );
  });

  it('recorta el token que llega con espacios de la barra de direcciones', () => {
    expect(RecoveryToken.create(`  ${aToken}  `)).toBe(aToken);
  });

  it('rechaza un token vacío', () => {
    for (const raw of ['', '   ']) {
      expect(() => RecoveryToken.create(raw)).toThrow();
    }
  });

  it('rechaza un token más corto que el límite', () => {
    expect(() => RecoveryToken.create('a'.repeat(RECOVERY_TOKEN_MIN_LENGTH - 1))).toThrow();
  });

  it('rechaza un token más largo que el límite', () => {
    expect(() => RecoveryToken.create('a'.repeat(RECOVERY_TOKEN_MAX_LENGTH + 1))).toThrow();
  });

  it('rechaza un token que lleva espacios o caracteres de control', () => {
    expect(() => RecoveryToken.create(`${aToken.slice(0, -1)} ${aToken.slice(-1)}`)).toThrow();
    expect(() => RecoveryToken.create(`${aToken.slice(0, -1)}\n${aToken.slice(-1)}`)).toThrow();
  });

  it('publica el motivo del rechazo en el error del dominio', () => {
    expect(() => RecoveryToken.create('short')).toThrow(
      expect.objectContaining({
        name: 'AuthValidationError',
        field: 'token',
        reason: 'El enlace de recuperación no es válido.',
      }),
    );
  });

  it('confía en el token que restaura el dominio', () => {
    expect(RecoveryToken.restore('the-token')).toBe('the-token');
  });
});
