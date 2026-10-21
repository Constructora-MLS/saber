import { InjectionToken } from '@angular/core';

/**
 * Base URL of the HTTP API of the platform.
 *
 * The default is relative, so the development server proxies the calls to
 * the Go backend without the browser leaving the origin of the application.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api/v1',
});
