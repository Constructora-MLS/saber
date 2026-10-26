import { InjectionToken } from '@angular/core';

/**
 * Base URL of the HTTP API of the platform.
 *
 * The API path is fixed; the development proxy reads its backend target from .env.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api/v1',
});
