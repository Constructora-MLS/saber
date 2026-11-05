import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AuthSessionStore } from '../../../iam/application/session/auth-session.store';
import { MlsIcon } from '../components/icons/mls-icon/mls-icon';
import { firstAccessibleRoute } from '../navigation/first-accessible-route';

/**
 * NotFoundPage answers a route that does not exist.
 *
 * The page is public: the address may be wrong even when the browser has
 * no session, and the answer of the platform is the same in both cases.
 */
@Component({
  imports: [MatButtonModule, MlsIcon],
  selector: 'app-not-found-page',
  styleUrl: './_status-shell.scss',
  template: `
    <main class="status" aria-labelledby="not-found-title">
      <header class="status__brand">
        <app-mls-icon size="2.5rem" label="Constructora MLS" />
        <div>
          <p class="status__brand-name">CONSTRUCTORA MLS</p>
          <p class="status__brand-copy">Espacio de trabajo</p>
        </div>
      </header>

      <section class="status__body">
        <p class="status__eyebrow">Error 404 · Página no encontrada</p>
        <h1 id="not-found-title" class="status__title">No encontramos esta página</h1>
        <p class="status__copy">
          La dirección puede estar mal escrita o el enlace ya no existe. Abre el selector para
          volver a una aplicación disponible.
        </p>

        <button matButton="filled" type="button" class="status__action" (click)="goToApplication()">
          Ver aplicaciones
        </button>
      </section>
    </main>
  `,
})
export class NotFoundPage {
  private readonly session = inject(AuthSessionStore);
  private readonly router = inject(Router);

  /** goToApplication takes the member to the first application he may open. */
  protected goToApplication(): void {
    const route = firstAccessibleRoute(this.session.permissions());
    void this.router.navigateByUrl(route ?? '/no-permissions');
  }
}
