import { Component, inject, input, OnChanges, output, signal, SimpleChanges } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FieldCounter } from '../../../../shared/presentation/components/field-counter/field-counter';
import {
  ACCOUNT_PASSWORD_MAX_LENGTH,
  ACCOUNT_PASSWORD_MIN_LENGTH,
} from '../../../domain/model/value-objects/password';

/**
 * The error of a group whose confirmation does not match its password.
 */
const PASSWORD_MISMATCH = 'passwordMismatch';

/**
 * The key of the error that the platform published for the password.
 *
 * The message of the platform is written on the control with this key, so the
 * field enters the error state of Material and the message is in the DOM: a
 * password that the client accepts and the platform rejects is a failure that
 * the member has to see.
 *
 * The key lives in one place: the template reads it from the form, so a typo
 * can never separate the code of the form from the copy of the template.
 */
export const RESET_PASSWORD_SERVER_ERROR = 'server';

/**
 * passwordsMatch refuses a group whose confirmation is not the password.
 *
 * The confirmation never leaves the form: the platform accepts one password
 * and the form is the one that compares the two.
 */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value as string | undefined;
  const confirmation = group.get('confirmation')?.value as string | undefined;

  if (!password || !confirmation) {
    return null;
  }

  return password === confirmation ? null : { [PASSWORD_MISMATCH]: true };
}

/**
 * ResetPasswordForm is the form that writes the new password of an account.
 *
 * The component only writes and reads the form: it never talks to the
 * platform. The page receives the password and changes it.
 */
@Component({
  selector: 'app-reset-password-form',
  imports: [
    FieldCounter,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
  ],
  templateUrl: './reset-password-form.component.html',
  styleUrl: './reset-password-form.component.scss',
})
export class ResetPasswordForm implements OnChanges {
  /** Whether the password is being changed. */
  readonly submitting = input(false);
  /**
   * The message that the platform published for the password.
   *
   * The page shows it next to the field that the platform rejected.
   */
  readonly passwordError = input<string | null>(null);
  /** The new password of the account. */
  readonly save = output<{ password: string }>();

  private readonly formBuilder = inject(FormBuilder);

  /** The shortest password that the platform accepts. */
  protected readonly passwordMinLength = ACCOUNT_PASSWORD_MIN_LENGTH;
  /** The longest password that the platform accepts. */
  protected readonly passwordMaxLength = ACCOUNT_PASSWORD_MAX_LENGTH;

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(ACCOUNT_PASSWORD_MIN_LENGTH),
          Validators.maxLength(ACCOUNT_PASSWORD_MAX_LENGTH),
        ],
      ],
      confirmation: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  /** Whether the password of the form is shown in clear. */
  protected readonly showPassword = signal(false);
  /** Whether the confirmation of the form is shown in clear. */
  protected readonly showConfirmation = signal(false);
  /** The key of the rejection of the platform, the one that the template reads. */
  protected readonly serverError = RESET_PASSWORD_SERVER_ERROR;

  /**
   * ngOnChanges writes the rejection of the platform on the control of the
   * password.
   *
   * The message of the platform is an error of the field: the control enters
   * the error state and the member sees the message next to the field, even
   * when the password that the member wrote is a valid one for the browser.
   */
  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['passwordError'];
    if (!change) {
      return;
    }

    const message = change.currentValue as string | null;
    if (message) {
      this.writeServerError(message);
      return;
    }

    this.clearServerError();
  }

  /** togglePassword shows or hides the password of the form. */
  protected togglePassword(): void {
    this.showPassword.update((visible) => !visible);
  }

  /** toggleConfirmation shows or hides the confirmation of the form. */
  protected toggleConfirmation(): void {
    this.showConfirmation.update((visible) => !visible);
  }

  /**
   * mismatch tells whether the confirmation is not the password that was
   * written.
   */
  protected get mismatch(): boolean {
    return this.form.hasError(PASSWORD_MISMATCH) && this.form.controls.confirmation.touched;
  }

  /** submit hands the password of the form to the page. */
  protected submit(): void {
    if (this.isBlocked()) {
      this.form.markAllAsTouched();
      return;
    }

    this.save.emit({ password: this.form.getRawValue().password });
  }

  /**
   * isBlocked tells whether the form holds a mistake that the member has to
   * correct.
   *
   * The rejection of the platform does not block the form: the member can
   * write another password and send it again without touching the field that
   * the platform rejected.
   */
  private isBlocked(): boolean {
    const { [RESET_PASSWORD_SERVER_ERROR]: _rejected, ...errors } =
      this.form.controls.password.errors ?? {};

    return (
      Object.keys(errors).length > 0 ||
      this.form.controls.confirmation.invalid ||
      this.form.hasError(PASSWORD_MISMATCH)
    );
  }

  /**
   * writeServerError writes the rejection of the platform on the control of
   * the password.
   */
  private writeServerError(message: string): void {
    const control = this.form.controls.password;
    control.setErrors({ ...(control.errors ?? {}), [RESET_PASSWORD_SERVER_ERROR]: message });
    control.markAsTouched();
    control.markAsDirty();
  }

  /**
   * clearServerError takes the rejection of the platform out of the control of
   * the password.
   */
  private clearServerError(): void {
    const control = this.form.controls.password;
    const errors = control.errors;
    if (!errors || !control.hasError(RESET_PASSWORD_SERVER_ERROR)) {
      return;
    }

    const { [RESET_PASSWORD_SERVER_ERROR]: _rejected, ...rest } = errors;
    control.setErrors(Object.keys(rest).length > 0 ? rest : null);
  }
}
