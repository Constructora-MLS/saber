import {
  afterNextRender,
  ApplicationRef,
  Component,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { Location } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { ResetPasswordCommandService } from '../../../application/command-services/auth-command-services';
import { AuthSessionStore } from '../../../application/session/auth-session.store';
import { AuthValidationError } from '../../../domain/model/errors/auth-errors';
import {
  ACCOUNT_PASSWORD_MAX_LENGTH,
  ACCOUNT_PASSWORD_MIN_LENGTH,
} from '../../../domain/model/value-objects/password';
import { RecoveryToken } from '../../../domain/model/value-objects/recovery-token';
import { isResetNotFound } from '../../../infrastructure/errors/auth-api.error';
import { MlsIcon } from '../../../../shared/presentation/components/icons/mls-icon/mls-icon';
import { ResetPasswordForm } from '../../components/reset-password-form/reset-password-form.component';
import { describePasswordFailure, fieldFailure } from '../password-failures';

/**
 * ResetPasswordPage is the page that writes the new password of an account.
 *
 * The page is the frontend controller of the flow: it receives the password
 * of the form and asks the platform to change it. It never talks to the API
 * directly.
 *
 * The credential of the link is read once and it is removed from the address
 * bar right away: the link is a credential and a credential never stays in
 * the history of the browser.
 */
@Component({
  imports: [MatButtonModule, MlsIcon, ResetPasswordForm],
  selector: 'app-reset-password-page',
  styleUrl: './reset-password.page.scss',
  templateUrl: './reset-password.page.html',
})
export class ResetPasswordPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly resetPassword = inject(ResetPasswordCommandService);
  private readonly session = inject(AuthSessionStore);
  private readonly injector = inject(Injector);

  /**
   * The credential of the link of recovery.
   *
   * The credential is read once, when the page starts, and it lives only in
   * the memory of the page: it is never written again in the address bar.
   */
  private token: RecoveryToken | null = null;

  /** Whether the link does not carry a credential that the browser accepts. */
  protected readonly invalidLink = signal(false);
  /** Whether the credential of the link is not valid anymore. */
  protected readonly expired = signal(false);
  /** Whether the password is being changed. */
  protected readonly submitting = signal(false);
  /** Whether the password was already changed. */
  protected readonly saved = signal(false);
  /** The message of the failure of the request. */
  protected readonly errorMessage = signal<string | null>(null);
  /** The message that the platform published for the password. */
  protected readonly passwordError = signal<string | null>(null);

  /** The shortest password that the platform accepts. */
  protected readonly passwordMinLength = ACCOUNT_PASSWORD_MIN_LENGTH;
  /** The longest password that the platform accepts. */
  protected readonly passwordMaxLength = ACCOUNT_PASSWORD_MAX_LENGTH;

  /** The message that the page publishes when the link is not valid. */
  private readonly invalidOutcome = viewChild<ElementRef<HTMLElement>>('invalidOutcome');
  /** The message that the page publishes when the link already expired. */
  private readonly expiredOutcome = viewChild<ElementRef<HTMLElement>>('expiredOutcome');
  /** The message that the page publishes when the password was changed. */
  private readonly savedOutcome = viewChild<ElementRef<HTMLElement>>('savedOutcome');

  /**
   * ngOnInit reads the credential of the link and takes it out of the
   * address bar.
   */
  ngOnInit(): void {
    this.token = this.read(this.route.snapshot.queryParamMap.get('token'));

    // The credential never stays in the address bar: the entry of the
    // history that carried it is replaced by the path of the page, so the
    // token does not linger in the history of the browser. The state of the
    // entry is kept, so the router still owns it and a later navigation to
    // that entry is a navigation of the router and not a new page.
    this.location.replaceState(this.router.url.split('?')[0], '', this.location.getState());
  }

  /** save changes the password of the account. */
  protected async save(data: { password: string }): Promise<void> {
    if (this.submitting() || !this.token) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.passwordError.set(null);

    try {
      await this.resetPassword.execute({ token: this.token, password: data.password });
      // The platform revoked the sessions of the member, so the browser
      // forgets its own session: the access token that it holds may live a
      // few minutes more, and it must not travel again.
      this.session.clear();
      // The credential of the link is dead: the page forgets it, so it never
      // travels again from the memory of the page.
      this.token = null;
      this.saved.set(true);
      this.focusOutcome();
    } catch (error) {
      if (isResetNotFound(error)) {
        this.expired.set(true);
        this.focusOutcome();
        return;
      }

      if (error instanceof AuthValidationError) {
        this.errorMessage.set(error.reason);
        return;
      }

      const field = fieldFailure(error, ['password']);
      if (field) {
        this.passwordError.set(field);
        return;
      }

      this.errorMessage.set(describePasswordFailure(error));
    } finally {
      this.submitting.set(false);
    }
  }

  /** goToSignIn takes the member to the sign in. */
  protected goToSignIn(): void {
    void this.router.navigateByUrl('/sign-in');
  }

  /** requestNewLink asks for a new link of recovery. */
  protected requestNewLink(): void {
    void this.router.navigateByUrl('/forgot-password');
  }

  /**
   * read validates the credential that the link carries.
   *
   * A link without a credential, or with a credential that the browser
   * refuses, never reaches the platform: the page shows that the link is not
   * valid and asks for a new one.
   */
  private read(raw: string | null): RecoveryToken | null {
    if (!raw) {
      this.invalidLink.set(true);
      this.focusOutcome();
      return null;
    }

    try {
      return RecoveryToken.create(raw);
    } catch (error) {
      if (error instanceof AuthValidationError) {
        this.invalidLink.set(true);
        this.focusOutcome();
        return null;
      }
      throw error;
    }
  }

  /**
   * focusOutcome moves the focus to the message that the page publishes.
   *
   * The button that the member used disappears from the DOM when the page
   * changes its state, so the focus would fall on the body of the document
   * and the assistive technologies would announce nothing. The page moves the
   * focus to the message that it publishes.
   */
  private focusOutcome(): void {
    // The application owns the render cycle: the tests never render the page.
    if (!this.injector.get(ApplicationRef, null, { optional: true })) {
      return;
    }

    afterNextRender(
      () => {
        const outcome = this.invalidOutcome() ?? this.expiredOutcome() ?? this.savedOutcome();
        outcome?.nativeElement.focus();
      },
      { injector: this.injector },
    );
  }
}
