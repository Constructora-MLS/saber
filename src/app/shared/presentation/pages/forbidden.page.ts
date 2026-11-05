import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthSessionStore } from '../../../iam/application/session/auth-session.store';
import { MlsIcon } from '../components/icons/mls-icon/mls-icon';
import { firstAccessibleRoute } from '../navigation/first-accessible-route';

/**
 * ForbiddenPage answers a route that the member may not open.
 *
 * The page is the difference between a route that does not exist and a
 * route that the platform does not grant to this member: the member knows
 * that the page exists and that his permissions do not open it.
 */
@Component({
  imports: [MatButtonModule, MlsIcon],
  selector: 'app-forbidden-page',
  styleUrl: './_status-shell.scss',
  template: `
    <main class="status" aria-labelledby="forbidden-title">
      <header class="status__brand">
        <app-mls-icon size="2.5rem" label="Constructora MLS" />
        <div>
          <p class="status__brand-name">CONSTRUCTORA MLS</p>
          <p class="status__brand-copy">Espacio de trabajo</p>
        </div>
      </header>

      <section class="status__body">
        <p class="status__eyebrow">Error 403 · Acceso denegado</p>
        <h1 id="forbidden-title" class="status__title">No tienes acceso a esta página</h1>
        <p class="status__copy">
          La página existe, pero tus permisos no la abren. Pide a la persona administradora que te
          conceda el permiso que falta.
        </p>

        <button matButton="filled" type="button" class="status__action" (click)="goToApplication()">
          Ver aplicaciones
        </button>
      </section>
    </main>
  `,
})
export class ForbiddenPage {
  private readonly session = inject(AuthSessionStore);
  private readonly router = inject(Router);

  /** goToApplication takes the member to the first application he may open. */
  protected goToApplication(): void {
    const route = firstAccessibleRoute(this.session.permissions());
    void this.router.navigateByUrl(route ?? '/no-permissions');
  }
}
