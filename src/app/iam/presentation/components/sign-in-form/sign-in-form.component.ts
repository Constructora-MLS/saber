import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { SignInCommand } from '../../../application/commands/iam-commands';
import { EMAIL_MAX_LENGTH } from '../../../domain/model/value-objects/email';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '../../../domain/model/value-objects/password';

/**
 * SignInForm is the form of the credentials of a user.
 *
 * The component only writes and reads the form: it never talks to the
 * platform. The page receives the credentials and opens the session.
 */
@Component({
  selector: 'app-sign-in-form',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  templateUrl: './sign-in-form.component.html',
  styleUrl: './sign-in-form.component.scss',
})
export class SignInForm {
  /** Whether the credentials are being sent to the platform. */
  readonly submitting = input(false);
  /** The message of the last failure. */
  readonly errorMessage = input<string | null>(null);
  /** The credentials that the user wrote. */
  readonly signIn = output<SignInCommand>();

  private readonly formBuilder = inject(FormBuilder);

  /** The longest address that the platform accepts. */
  protected readonly emailMaxLength = EMAIL_MAX_LENGTH;
  /** The shortest password that the platform accepts. */
  protected readonly passwordMinLength = PASSWORD_MIN_LENGTH;
  /** The longest password that the platform accepts. */
  protected readonly passwordMaxLength = PASSWORD_MAX_LENGTH;

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(EMAIL_MAX_LENGTH)]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(PASSWORD_MIN_LENGTH),
        Validators.maxLength(PASSWORD_MAX_LENGTH),
      ],
    ],
  });

  /** Whether the password of the form is shown in clear. */
  protected readonly showPassword = signal(false);

  /** togglePassword shows or hides the password of the form. */
  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  /** submit hands the credentials of the form to the page. */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.signIn.emit(this.form.getRawValue());
  }
}
