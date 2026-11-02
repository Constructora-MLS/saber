import '@angular/compiler';
import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import {
  AuthApiError,
  isUnauthorized,
  statusOf,
  toAuthApiError,
  UNAUTHORIZED_STATUS,
} from './auth-api.error';

describe('statusOf', () => {
  it('lee el estado de la respuesta del cliente', () => {
    expect(statusOf(new HttpErrorResponse({ status: 401 }))).toBe(401);
    expect(statusOf(new HttpErrorResponse({ status: 503 }))).toBe(503);
    expect(statusOf(new HttpErrorResponse({ status: 0 }))).toBe(0);
  });

  it('lee el estado del error del contexto', () => {
    expect(statusOf(new AuthApiError(401, 'invalid_refresh_token', 'dead'))).toBe(401);
    expect(statusOf(new AuthApiError(503, 'service_unavailable', 'down'))).toBe(503);
  });

  it('no encuentra el estado de un fallo que no viene de la plataforma', () => {
    expect(statusOf(new Error('boom'))).toBeNull();
    expect(statusOf(null)).toBeNull();
    expect(statusOf(undefined)).toBeNull();
    expect(statusOf({ status: 401 })).toBeNull();
  });
});

describe('isUnauthorized', () => {
  it('reconoce la credencial que la plataforma rechazó', () => {
    expect(isUnauthorized(new HttpErrorResponse({ status: UNAUTHORIZED_STATUS }))).toBe(true);
    expect(isUnauthorized(new AuthApiError(401, 'invalid_refresh_token', 'dead'))).toBe(true);
  });

  it('no confunde otro fallo con una credencial rechazada', () => {
    expect(isUnauthorized(new HttpErrorResponse({ status: 403 }))).toBe(false);
    expect(isUnauthorized(new HttpErrorResponse({ status: 503 }))).toBe(false);
    expect(isUnauthorized(new Error('boom'))).toBe(false);
    expect(isUnauthorized(null)).toBe(false);
  });
});

describe('toAuthApiError', () => {
  it('traduce el problema que publica la plataforma', () => {
    const error = toAuthApiError(401, { code: 'invalid_refresh_token', detail: 'The token died.' });

    expect(error).toBeInstanceOf(AuthApiError);
    expect(error.status).toBe(401);
    expect(error.code).toBe('invalid_refresh_token');
    expect(error.detail).toBe('The token died.');
  });

  it('traduce un cuerpo que no sigue el contrato en un fallo inesperado', () => {
    const error = toAuthApiError(503, 'boom');

    expect(error.status).toBe(503);
    expect(error.code).toBe('unexpected_error');
  });
});
