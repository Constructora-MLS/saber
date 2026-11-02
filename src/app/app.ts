import { Component, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthSessionStore } from './iam/application/session/auth-session.store';
import { isPublicRoute } from './app.routes';

/**
 * App is the shell of the application.
 *
 * The shell hosts the outlet of the router and the reaction to the death of
 * the credential of the session. The HTTP boundary reports the rejection of
 * the credential through the store of the session, and the presentation is
 * the layer that knows the routes of the application, so the navigation to
 * the sign in belongs here.
 */
@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly session = inject(AuthSessionStore);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      // The reaction reads the count of the deaths and not a flag: the
      // count grows with every death, so a credential that dies again after
      // a renewal raises it again and the user goes back to the sign in.
      const deaths = this.session.rejectionCount();

      if (deaths === 0) {
        return;
      }

      // The user is in a public flow: the sign in, the acceptance of an
      // invitation or the verification of a certificate answer without a
      // credential, so the death of the credential does not interrupt them.
      if (isPublicRoute(this.router.url)) {
        return;
      }

      void this.router.navigate(['/sign-in']);
    });
  }
}
