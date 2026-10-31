import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FieldCounter } from '../../../../shared/presentation/components/field-counter/field-counter';
import {
  ACCOUNT_PASSWORD_MAX_LENGTH,
  ACCOUNT_PASSWORD_MIN_LENGTH,
} from '../../../domain/model/value-objects/password';
import { PERSON_NAME_MAX_LENGTH } from '../../../domain/model/value-objects/person-name';

/**
 * AcceptInvitationData is the account that the invited member writes.
 */
export interface AcceptInvitationData {
  readonly firstName: string;
  readonly lastName: string;
  readonly password: string;
}

/**
 * AcceptInvitationForm is the form that activates an invited account.
 *
 * The component only writes and reads the form: it never talks to the
 * platform. The page receives the account and activates it.
 *
 * The form reuses the components of Material 3 and the fields of the sign
 * in, so both pages of the access look the same.
 */
@Component({
  selector: 'app-accept-invitation-form',
  imports: [
    FieldCounter,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './accept-invitation-form.component.html',
  styleUrl: './accept-invitation-form.component.scss',
})
export class AcceptInvitationForm {
  /** The address that the invitation bound. */
  readonly email = input.required<string>();
  /** Whether the account is being activated. */
  readonly submitting = input(false);

  /** The account that the invited member wrote. */
  readonly accept = output<AcceptInvitationData>();

  private readonly formBuilder = inject(FormBuilder);

  /** The limit of the names. */
  protected readonly personNameMaxLength = PERSON_NAME_MAX_LENGTH;
  /** The shortest password that the platform accepts. */
  protected readonly passwordMinLength = ACCOUNT_PASSWORD_MIN_LENGTH;
  /** The longest password that the platform accepts. */
  protected readonly passwordMaxLength = ACCOUNT_PASSWORD_MAX_LENGTH;

  protected readonly form = this.formBuilder.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(PERSON_NAME_MAX_LENGTH)]],
    lastName: ['', [Validators.required, Validators.maxLength(PERSON_NAME_MAX_LENGTH)]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(ACCOUNT_PASSWORD_MIN_LENGTH),
        Validators.maxLength(ACCOUNT_PASSWORD_MAX_LENGTH),
      ],
    ],
  });

  /** Whether the password of the form is shown in clear. */
  protected readonly showPassword = signal(false);

  /** togglePassword shows or hides the password of the form. */
  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  /** submit hands the account of the form to the page. */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.accept.emit(this.form.getRawValue());
  }
}
