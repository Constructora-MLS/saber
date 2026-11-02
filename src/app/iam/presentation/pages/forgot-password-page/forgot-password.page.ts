import {
  afterNextRender,
  ApplicationRef,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { ForgotPasswordCommandService } from '../../../application/command-services/auth-command-services';
import { ForgotPasswordCommand } from '../../../application/commands/iam-commands';
import { AuthSessionStore } from '../../../application/session/auth-session.store';
import { AuthValidationError } from '../../../domain/model/errors/auth-errors';
import { MlsIcon } from '../../../../shared/presentation/components/icons/mls-icon/mls-icon';
import { RecoveryLinkForm } from '../../components/recovery-link-form/recovery-link-form.component';
import { describeRecoveryFailure, fieldFailure } from '../password-failures';

/**
 * ForgotPasswordPage is the page that asks for a link that recovers the
 * password.
 *
 * The page is the frontend controller of the flow: it receives the address
 * of the form and asks the platform for the link. It never talks to the API
 * directly.
 *
 * The answer of the platform is the same for every address, so the page
 * never says that an account exists: it always shows the same neutral
 * message.
 */
@Component({
  imports: [MatButtonModule, MatProgressSpinnerModule, MlsIcon, RecoveryLinkForm, RouterLink],
  selector: 'app-forgot-password-page',
  styleUrl: './forgot-password.page.scss',
  templateUrl: './forgot-password.page.html',
})
export class ForgotPasswordPage {
  private readonly forgotPassword = inject(ForgotPasswordCommandService);
  private readonly session = inject(AuthSessionStore);
  private readonly injector = inject(Injector);

  /** Whether the link is being requested. */
  protected readonly sending = signal(false);
  /** Whether the platform already answered the request. */
  protected readonly sent = signal(false);
  /** The message of the failure of the request. */
  protected readonly errorMessage = signal<string | null>(null);
  /** The message that the platform published for the address. */
  protected readonly emailError = signal<string | null>(null);
  /**
   * The address that the platform answered for.
   *
   * The page keeps it so the member that failed to ask for the link finds
   * the address already written when the form comes back.
   */
  protected readonly requestedEmail = signal<string | null>(null);

  /**
   * The address of the account of the session.
   *
   * The address fills the form when the browser holds a session, so the
   * member does not write it again. It never travels in the address bar.
   */
  protected readonly email = computed(() => this.session.identity()?.email ?? '');

  /**
   * The address that the form starts with.
   *
   * The address of the session comes first, and the address that the member
   * wrote comes second: a member that asked for a link with another address
   * finds that address when the form comes back.
   */
  protected readonly initialEmail = computed(() => this.requestedEmail() || this.email());

  /**
   * Whether the page publishes the message that says the link was sent.
   *
   * The message is published only when the last attempt succeeded: a failed
   * attempt shows its failure and never claims that the link was sent.
   */
  protected readonly confirmsSent = computed(() => this.sent() && !this.errorMessage());

  /** The message that the page publishes when the platform already answered. */
  private readonly outcome = viewChild<ElementRef<HTMLElement>>('outcome');

  /** request asks the platform for the link of recovery. */
  protected async request(command: ForgotPasswordCommand): Promise<void> {
    if (this.sending()) {
      return;
    }

    this.sending.set(true);
    this.errorMessage.set(null);
    this.emailError.set(null);
    this.requestedEmail.set(command.email);

    try {
      await this.forgotPassword.execute(command);
      this.sent.set(true);
      this.focusOutcome();
    } catch (error) {
      // The form comes back with the address that the member wrote, so a
      // failure of the platform never makes the member write it again.
      this.sent.set(false);
      this.describe(error);
    } finally {
      this.sending.set(false);
    }
  }

  /**
   * describe turns a failure into the message that the page shows.
   *
   * The failure of a field is shown next to the field, and the rest of the
   * failures are shown in the banner of the page.
   */
  private describe(error: unknown): void {
    if (error instanceof AuthValidationError) {
      this.errorMessage.set(error.reason);
      return;
    }

    const field = fieldFailure(error, ['email']);
    if (field) {
      this.emailError.set(field);
      return;
    }

    this.errorMessage.set(describeRecoveryFailure(error));
  }

  /**
   * focusOutcome moves the focus to the message that the page publishes.
   *
   * The button that the member used disappears from the DOM when the page
   * changes its state, so the focus would fall on the body of the document
   * and the assistive technologies would announce nothing. The page moves
   * the focus to the message that it publishes.
   */
  private focusOutcome(): void {
    // The application owns the render cycle: the tests never render the page.
    if (!this.injector.get(ApplicationRef, null, { optional: true })) {
      return;
    }

    afterNextRender(
      () => {
        const message = this.outcome()?.nativeElement;
        if (!message) {
          return;
        }

        message.focus();
        // The browser selects the text of the element that receives the
        // focus, so the message would appear highlighted: the selection is
        // taken away.
        window.getSelection()?.removeAllRanges();
      },
      { injector: this.injector },
    );
  }
}
