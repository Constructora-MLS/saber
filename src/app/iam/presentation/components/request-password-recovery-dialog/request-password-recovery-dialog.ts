import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ForgotPasswordCommandService } from '../../../application/command-services/auth-command-services';
import { AuthValidationError } from '../../../domain/model/errors/auth-errors';
import { describeRecoveryFailure } from '../../pages/password-failures';

/**
 * RecoverableAccount is the account whose password the member wants to
 * recover.
 *
 * The dialog receives the address of the account: it is the one of the
 * session, so the member never writes it again.
 */
export interface RecoverableAccount {
  /** The address that receives the link of recovery. */
  readonly email: string;
}

/**
 * RequestPasswordRecoveryDialog asks the platform for a link that recovers
 * the password of the account.
 *
 * The dialog is the flow of the member that already holds a session: the
 * address of the account is known, so the member only confirms that the
 * link must be sent.
 */
@Component({
  imports: [MatButtonModule, MatDialogModule, MatProgressSpinnerModule],
  selector: 'app-request-password-recovery-dialog',
  styleUrl: './request-password-recovery-dialog.scss',
  templateUrl: './request-password-recovery-dialog.html',
})
export class RequestPasswordRecoveryDialog {
  private readonly forgotPassword = inject(ForgotPasswordCommandService);
  private readonly dialogRef =
    inject<MatDialogRef<RequestPasswordRecoveryDialog, boolean>>(MatDialogRef);
  /** The account whose password the member wants to recover. */
  protected readonly account = inject<RecoverableAccount>(MAT_DIALOG_DATA);

  /** Whether the request of the link is running. */
  protected readonly sending = signal(false);
  /** The message of the failure of the request. */
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * cancel closes the dialog without asking for the link.
   */
  protected cancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * confirm asks the platform for the link of recovery.
   *
   * The dialog stays open when the platform fails, so the member can try
   * again without starting over.
   */
  protected async confirm(): Promise<void> {
    if (this.sending()) {
      return;
    }

    this.sending.set(true);
    this.errorMessage.set(null);

    try {
      await this.forgotPassword.execute({ email: this.account.email });
      this.dialogRef.close(true);
    } catch (error) {
      this.errorMessage.set(this.describe(error));
    } finally {
      this.sending.set(false);
    }
  }

  /**
   * describe turns a failure into the message that the dialog shows.
   */
  private describe(error: unknown): string {
    if (error instanceof AuthValidationError) {
      return error.reason;
    }

    return describeRecoveryFailure(error);
  }
}
