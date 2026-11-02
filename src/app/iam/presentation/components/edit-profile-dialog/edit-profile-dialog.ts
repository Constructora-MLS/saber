import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { UpdateProfileCommandService } from '../../../application/command-services/user-command-services';
import { PlatformUser } from '../../../domain/model/aggregates/platform-user';
import { AuthValidationError } from '../../../domain/model/errors/auth-errors';
import { PERSON_NAME_MAX_LENGTH } from '../../../domain/model/value-objects/person-name';
import { UserApiError } from '../../../infrastructure/errors/user-api.error';
import { describeUserFailure, userFieldFailure } from '../../pages/user-failures';
import { FieldCounter } from '../../../../shared/presentation/components/field-counter/field-counter';

/**
 * EditableProfile are the names that the dialog edits.
 *
 * The dialog receives the names that the platform published, so the user
 * edits the identity that he already has.
 */
export interface EditableProfile {
  /** The first name of the user. */
  readonly firstName: string;
  /** The last name of the user. */
  readonly lastName: string;
}

/**
 * EditProfileDialog changes the names of the authenticated user.
 *
 * The dialog asks only for the names: the address of the account and its
 * credential never change from here.
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
  selector: 'app-edit-profile-dialog',
  styleUrl: './edit-profile-dialog.scss',
  templateUrl: './edit-profile-dialog.html',
})
export class EditProfileDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly updateProfile = inject(UpdateProfileCommandService);
  private readonly dialogRef =
    inject<MatDialogRef<EditProfileDialog, PlatformUser | undefined>>(MatDialogRef);
  private readonly profile = inject<EditableProfile>(MAT_DIALOG_DATA);

  /** The limit of the names. */
  protected readonly nameMaxLength = PERSON_NAME_MAX_LENGTH;

  protected readonly form = this.formBuilder.nonNullable.group({
    firstName: [
      this.profile.firstName,
      [Validators.required, Validators.maxLength(PERSON_NAME_MAX_LENGTH)],
    ],
    lastName: [
      this.profile.lastName,
      [Validators.required, Validators.maxLength(PERSON_NAME_MAX_LENGTH)],
    ],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * cancel closes the dialog without changing anything.
   */
  protected cancel(): void {
    this.dialogRef.close(undefined);
  }

  /**
   * submit saves the names of the user.
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
      const { firstName, lastName } = this.form.getRawValue();
      const user = await this.updateProfile.execute({ firstName, lastName });
      this.dialogRef.close(user);
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
      return (
        userFieldFailure(error, ['firstName', 'lastName']) ?? describeUserFailure(error).message
      );
    }
    if (error instanceof AuthValidationError) {
      return error.reason;
    }
    return 'No se pudo guardar el nombre.';
  }
}
