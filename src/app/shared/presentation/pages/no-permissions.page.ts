import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { AuthSessionStore } from '../../../iam/application/session/auth-session.store';
import { MlsIcon } from '../components/icons/mls-icon/mls-icon';

/**
 * NoPermissionsPage answers a member that the platform grants no access to.
 *
 * The page is the difference between a route that the member may not open
 * and a member that has no access to any application: the groups of the
 * member determine what he may open, so the page asks for a group.
 */
@Component({
  imports: [MatButtonModule, MlsIcon],
  selector: 'app-no-permissions-page',
  styleUrl: './_status-shell.scss',
  template: `
    <main class="status" aria-labelledby="no-permissions-title">
      <header class="status__brand">
        <app-mls-icon size="2.5rem" label="Constructora MLS" />
        <div>
          <p class="status__brand-name">CONSTRUCTORA MLS</p>
          <p class="status__brand-copy">Espacio de trabajo</p>
        </div>
      </header>

      <section class="status__body">
        <p class="status__eyebrow">Cuenta activa · Sin grupo</p>
        <h1 id="no-permissions-title" class="status__title">
          Tu cuenta aún no tiene un grupo asignado
        </h1>
        <p class="status__copy">
          Los grupos determinan a qué aplicaciones puedes entrar. Pide a la persona administradora
          que te asigne uno; después, vuelve a iniciar sesión.
        </p>

        <p class="status__note">
          <strong>¿No esperabas este mensaje?</strong> Comprueba que has iniciado sesión con la
          cuenta correcta.
        </p>

        <button matButton="filled" type="button" class="status__action" (click)="signOut()">
          Cerrar sesión
        </button>
      </section>
    </main>
  `,
})
export class NoPermissionsPage {
  private readonly session = inject(AuthSessionStore);
  private readonly router = inject(Router);

  /** signOut closes the session and takes the member to the sign in. */
  protected async signOut(): Promise<void> {
    await this.session.logout();
    await this.router.navigateByUrl('/sign-in');
  }
}
