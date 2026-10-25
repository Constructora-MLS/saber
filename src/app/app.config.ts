import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideCatalog } from './catalog/infrastructure/catalog.providers';
import { provideCertificates } from './certificates/infrastructure/certificates.providers';
import { provideEmployees } from './employees/infrastructure/employees.providers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes),
    provideCatalog(),
    provideCertificates(),
    provideEmployees(),
  ],
};
