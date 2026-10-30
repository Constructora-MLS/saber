import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthSessionStore } from '../../../application/session/auth-session.store';

/**
 * SettingsPage is the configuration of the account of the user.
 *
 * The page shows the identity that the platform published and it closes the
 * session of the user when he asks for it.
 */
@Component({
  imports: [MatButtonModule, MatSnackBarModule],
  selector: 'app-settings-page',
  styleUrl: './settings.page.scss',
  templateUrl: './settings.page.html',
})
export class SettingsPage {
  private readonly session = inject(AuthSessionStore);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly closing = signal(false);

  /** The name of the authenticated user. */
  protected readonly userName = computed(() => {
    const identity = this.session.identity();
    if (!identity) {
      return '';
    }

    const name = [identity.firstName, identity.lastName].filter(Boolean).join(' ').trim();
    return name || identity.email;
  });

  /** The address of the authenticated user. */
  protected readonly userEmail = computed(() => this.session.identity()?.email ?? '');

  /** logout closes the session and takes the user back to the sign in. */
  protected async logout(): Promise<void> {
    if (this.closing()) {
      return;
    }

    this.closing.set(true);
    try {
      await this.session.logout();
      await this.router.navigateByUrl('/sign-in');
    } catch {
      this.notify('No se pudo cerrar la sesión. Inténtalo nuevamente.');
    } finally {
      this.closing.set(false);
    }
  }

  /**
   * notify shows the outcome of the action, the same way the rest of the
   * platform shows the outcome of its actions.
   */
  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
