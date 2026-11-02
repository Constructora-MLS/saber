import { Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthSessionStore } from '../../../application/session/auth-session.store';
import {
  EditableProfile,
  EditProfileDialog,
} from '../../components/edit-profile-dialog/edit-profile-dialog';
import { RequestPasswordRecoveryDialog } from '../../components/request-password-recovery-dialog/request-password-recovery-dialog';

/**
 * SettingsPage is the configuration of the account of the user.
 *
 * The page shows the identity that the platform published, it offers the
 * edition of the names of the user and it closes the session of the user
 * when he asks for it.
 */
@Component({
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatSnackBarModule],
  selector: 'app-settings-page',
  styleUrl: './settings.page.scss',
  templateUrl: './settings.page.html',
})
export class SettingsPage {
  private readonly session = inject(AuthSessionStore);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

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

  /** goBack takes the user back to the page he came from. */
  protected goBack(): void {
    this.location.back();
  }

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
   * openProfileDialog opens the dialog that edits the names of the user.
   *
   * The names that the platform published are the ones that the dialog
   * edits, and the session keeps the identity that the platform answers,
   * so the name of the sidebar is the new one.
   */
  protected openProfileDialog(): void {
    const identity = this.session.identity();
    if (!identity) {
      return;
    }

    const profile: EditableProfile = {
      firstName: identity.firstName,
      lastName: identity.lastName,
    };

    this.dialog
      .open(EditProfileDialog, { data: profile, width: '30rem', maxWidth: '94vw' })
      .afterClosed()
      .subscribe((user) => {
        if (!user) {
          return;
        }

        this.session.applyProfile(user);
        this.notify('Nombre actualizado.');
      });
  }

  /**
   * changePassword asks for a link that recovers the password of the account.
   *
   * The address of the account is the one of the session, so the member
   * never writes it again and the page never leaves the settings: the dialog
   * asks the platform for the link and the page publishes the outcome.
   */
  protected changePassword(): void {
    const email = this.session.identity()?.email;
    if (!email) {
      return;
    }

    this.dialog
      .open(RequestPasswordRecoveryDialog, {
        data: { email },
        autoFocus: 'first-heading',
        width: '30rem',
        maxWidth: '94vw',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) {
          return;
        }

        // The copy is neutral: the platform answers the same for every
        // address, so the page never says that the account exists.
        this.notify(
          `Si el correo corresponde a una cuenta activa, recibirás un enlace para restablecer tu contraseña en ${email}.`,
        );
      });
  }

  /**
   * notify shows the outcome of the action, the same way the rest of the
   * platform shows the outcome of its actions.
   */
  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
