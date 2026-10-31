import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { InviteUserCommandService } from '../../../application/command-services/user-command-services';
import { AuthValidationError } from '../../../domain/model/errors/auth-errors';
import { EMAIL_MAX_LENGTH } from '../../../domain/model/value-objects/email';
import { UserApiError } from '../../../infrastructure/errors/user-api.error';
import { describeUserFailure, userFieldFailure } from '../../pages/user-failures';
import { FieldCounter } from '../../../../shared/presentation/components/field-counter/field-counter';

/**
 * InviteUserDialog invites a member of the platform.
 *
 * The dialog asks only for the address of the invited member: the names and
 * the password are chosen by the invited member when it accepts the
 * invitation.
 */
@Component({
  imports: [
    FieldCounter,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  selector: 'app-invite-user-dialog',
  styleUrl: './invite-user-dialog.scss',
  templateUrl: './invite-user-dialog.html',
})
export class InviteUserDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly inviteUser = inject(InviteUserCommandService);
  private readonly dialogRef = inject<MatDialogRef<InviteUserDialog, boolean>>(MatDialogRef);

  /** The limit of the address. */
  protected readonly emailMaxLength = EMAIL_MAX_LENGTH;

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(EMAIL_MAX_LENGTH)]],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * cancel closes the dialog without inviting anybody.
   */
  protected cancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * submit sends the invitation.
   */
  protected async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      await this.inviteUser.execute({ email: this.form.getRawValue().email.trim() });
      this.dialogRef.close(true);
    } catch (error) {
      this.errorMessage.set(this.describe(error));
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * describe turns a failure into the message the interfaces show.
   */
  private describe(error: unknown): string {
    if (error instanceof UserApiError) {
      return userFieldFailure(error, ['email']) ?? describeUserFailure(error).message;
    }
    if (error instanceof AuthValidationError) {
      return error.reason;
    }
    return 'No se pudo enviar la invitación.';
  }
}
