import { Component, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthSessionStore } from '../../../iam/application/session/auth-session.store';
import { firstAccessibleRoute } from '../navigation/first-accessible-route';

/**
 * LandingPage takes the member to the first application that he may open.
 *
 * The platform grants every member the permissions of every group they
 * belong to, so the first application of the member is not always the same:
 * the landing reads the permissions of the session and opens the first
 * section that they grant.
 */
@Component({
  selector: 'app-landing-page',
  template: '',
})
export class LandingPage {
  private readonly session = inject(AuthSessionStore);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const route = firstAccessibleRoute(this.session.permissions());
      void this.router.navigateByUrl(route ?? '/no-permissions');
    });
  }
}
