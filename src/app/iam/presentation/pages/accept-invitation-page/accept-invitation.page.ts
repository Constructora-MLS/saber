import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { AcceptInvitationCommandService } from '../../../application/command-services/user-command-services';
import { GetInvitationQueryService } from '../../../application/query-services/user-query-services';
import { AuthValidationError } from '../../../domain/model/errors/auth-errors';
import { UserApiError } from '../../../infrastructure/errors/user-api.error';
import { MlsIcon } from '../../../../shared/presentation/components/icons/mls-icon/mls-icon';
import {
  AcceptInvitationData,
  AcceptInvitationForm,
} from '../../components/accept-invitation-form/accept-invitation-form.component';

/**
 * AcceptInvitationPage is the page that activates an invited account.
 *
 * The page is the frontend controller of the bounded context: it reads the
 * invitation through the use case, it receives the account of the form and
 * it activates it. It never talks to the API directly.
 */
@Component({
  imports: [
    AcceptInvitationForm,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MlsIcon,
  ],
  selector: 'app-accept-invitation-page',
  styleUrl: './accept-invitation.page.scss',
  templateUrl: './accept-invitation.page.html',
})
export class AcceptInvitationPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly getInvitation = inject(GetInvitationQueryService);
  private readonly acceptInvitation = inject(AcceptInvitationCommandService);

  /** The address that the invitation bound. */
  protected readonly email = signal<string | null>(null);
  /** Whether the invitation is being read. */
  protected readonly loading = signal(true);
  /** Whether the invitation is not valid anymore. */
  protected readonly expired = signal(false);
  /** Whether the account is being activated. */
  protected readonly submitting = signal(false);
  /** The name of the account that was activated. */
  protected readonly acceptedName = signal<string | null>(null);
  /** The message of the failure of the activation. */
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * ngOnInit reads the invitation that the token addresses.
   */
  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.expired.set(true);
      this.loading.set(false);
      return;
    }

    void this.load(token);
  }

  /**
   * accept activates the account of the invitation.
   */
  protected async accept(data: AcceptInvitationData): Promise<void> {
    if (this.submitting()) {
      return;
    }

    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.expired.set(true);
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const user = await this.acceptInvitation.execute({ token, ...data });
      this.acceptedName.set(user.fullName);
    } catch (error) {
      if (this.isExpired(error)) {
        this.expired.set(true);
        return;
      }
      this.errorMessage.set(this.describe(error));
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * goToSignIn takes the invited member to the sign in.
   */
  protected goToSignIn(): void {
    void this.router.navigateByUrl('/sign-in');
  }

  /**
   * load reads the address that the invitation bound.
   */
  private async load(token: string): Promise<void> {
    this.loading.set(true);

    try {
      this.email.set(await this.getInvitation.execute({ token }));
    } catch (error) {
      if (this.isExpired(error)) {
        this.expired.set(true);
        return;
      }
      this.errorMessage.set(this.describe(error));
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * isExpired reports whether the invitation is not valid anymore.
   */
  private isExpired(error: unknown): boolean {
    return error instanceof UserApiError && error.status === 404;
  }

  /**
   * describe turns a failure into the message the interfaces show.
   */
  private describe(error: unknown): string {
    if (error instanceof UserApiError) {
      if (error.code === 'user_conflict') {
        return 'El correo de la invitación ya está registrado. Intenta iniciar sesión.';
      }
      const field = error.messageOfField('password');
      if (field) {
        return 'La contraseña no cumple las reglas de la plataforma.';
      }
      return 'No se pudo activar la cuenta. Inténtalo nuevamente.';
    }
    if (error instanceof AuthValidationError) {
      return error.reason;
    }
    return 'No se pudo activar la cuenta. Inténtalo nuevamente.';
  }
}
