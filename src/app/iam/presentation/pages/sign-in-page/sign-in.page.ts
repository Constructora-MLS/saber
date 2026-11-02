import { Component, inject, signal } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { SignInCommand } from '../../../application/commands/iam-commands';
import { AuthSessionStore } from '../../../application/session/auth-session.store';
import { AuthValidationError } from '../../../domain/model/errors/auth-errors';
import { AuthApiError } from '../../../infrastructure/errors/auth-api.error';
import { SignInForm } from '../../components/sign-in-form/sign-in-form.component';
import { MlsIcon } from '../../../../shared/presentation/components/icons/mls-icon/mls-icon';

/**
 * SignInPage is the page of the access to the platform.
 *
 * The page orchestrates the session: the form hands the credentials and the
 * page opens the session and returns the user to the route he wanted.
 */
@Component({
  imports: [MatSnackBarModule, MlsIcon, SignInForm],
  selector: 'app-sign-in-page',
  styleUrl: './sign-in.page.scss',
  templateUrl: './sign-in.page.html',
})
export class SignInPage {
  private readonly session = inject(AuthSessionStore);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly submitting = signal(false);

  constructor() {
    // A browser that already holds a session does not sign in twice.
    if (this.session.authenticated()) {
      void this.router.navigateByUrl('/');
    }
  }

  /** signIn opens the session with the credentials of the form. */
  protected async signIn(command: SignInCommand): Promise<void> {
    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);

    try {
      await this.session.signIn(command);
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.notify(this.describe(error));
    } finally {
      this.submitting.set(false);
    }
  }

  private describe(error: unknown): string {
    if (error instanceof AuthValidationError) {
      return error.reason;
    }
    if (error instanceof AuthApiError && error.status === 401) {
      return 'Las credenciales no son válidas. Revisa tu correo y tu contraseña.';
    }
    return 'No se pudo iniciar sesión. Inténtalo nuevamente.';
  }

  /**
   * notify shows the outcome of the sign in, the same way the rest of the
   * platform shows the outcome of its actions.
   */
  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
