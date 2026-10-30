import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './iam/infrastructure/http/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // The interceptor of the IAM context adds the access token to the private
    // requests of the platform.
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
  ],
};
