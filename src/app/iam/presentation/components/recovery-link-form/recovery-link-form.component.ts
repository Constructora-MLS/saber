import { Component, inject, input, OnChanges, output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FieldCounter } from '../../../../shared/presentation/components/field-counter/field-counter';
import { ForgotPasswordCommand } from '../../../application/commands/iam-commands';
import { EMAIL_MAX_LENGTH } from '../../../domain/model/value-objects/email';

/**
 * The key of the error that the platform published for the address.
 *
 * The message of the platform is written on the control with this key, so the
 * field enters the error state of Material and the message is in the DOM: an
 * address that the client accepts and the platform rejects is a failure that
 * the member has to see.
 *
 * The key lives in one place: the template reads it from the form, so a typo
 * can never separate the code of the form from the copy of the template.
 */
export const RECOVERY_LINK_SERVER_ERROR = 'server';

/**
 * RecoveryLinkForm is the form that asks for a link that recovers the
 * password.
 *
 * The component only writes and reads the form: it never talks to the
 * platform. The page receives the address and asks for the link.
 */
@Component({
  selector: 'app-recovery-link-form',
  imports: [
    FieldCounter,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
  ],
  templateUrl: './recovery-link-form.component.html',
  styleUrl: './recovery-link-form.component.scss',
})
export class RecoveryLinkForm implements OnChanges {
  /** Whether the link is being requested. */
  readonly submitting = input(false);
  /**
   * The address that the form starts with.
   *
   * The page fills it with the address of the session when the browser
   * holds one, so the member does not write it again.
   */
  readonly email = input<string>('');
  /**
   * The message that the platform published for the address.
   *
   * The page shows it next to the field that the platform rejected.
   */
  readonly emailError = input<string | null>(null);
  /** The request of the link of recovery. */
  readonly request = output<ForgotPasswordCommand>();

  private readonly formBuilder = inject(FormBuilder);

  /** The longest address that the platform accepts. */
  protected readonly emailMaxLength = EMAIL_MAX_LENGTH;
  /** The key of the rejection of the platform, the one that the template reads. */
  protected readonly serverError = RECOVERY_LINK_SERVER_ERROR;

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(EMAIL_MAX_LENGTH)]],
  });

  /**
   * ngOnChanges reacts to the address of the page and to the rejection of the
   * platform.
   *
   * The address is only written while the control is pristine, so what the
   * member writes is never lost.
   */
  ngOnChanges(changes: SimpleChanges): void {
    const address = changes['email'];
    if (address) {
      this.writeAddress(address.currentValue as string);
    }

    const rejection = changes['emailError'];
    if (!rejection) {
      return;
    }

    const message = rejection.currentValue as string | null;
    if (message) {
      this.writeServerError(message);
      return;
    }

    this.clearServerError();
  }

  /** submit hands the address of the form to the page. */
  protected submit(): void {
    if (this.isBlocked()) {
      this.form.markAllAsTouched();
      return;
    }

    this.request.emit({ email: this.form.getRawValue().email });
  }

  /**
   * isBlocked tells whether the form holds a mistake that the member has to
   * correct.
   *
   * The rejection of the platform does not block the form: the member can
   * write another address and send it again without touching the field that
   * the platform rejected.
   */
  private isBlocked(): boolean {
    const { [RECOVERY_LINK_SERVER_ERROR]: _rejected, ...errors } =
      this.form.controls.email.errors ?? {};

    return Object.keys(errors).length > 0;
  }

  /**
   * writeAddress writes the address of the page in the control of the form.
   *
   * The address is only written while the control is pristine: what the
   * member wrote is never lost.
   */
  private writeAddress(address: string): void {
    const control = this.form.controls.email;
    if (!address || control.dirty || control.touched || control.value === address) {
      return;
    }

    control.setValue(address);
  }

  /**
   * writeServerError writes the rejection of the platform on the control of
   * the address.
   */
  private writeServerError(message: string): void {
    const control = this.form.controls.email;
    control.setErrors({ ...(control.errors ?? {}), [RECOVERY_LINK_SERVER_ERROR]: message });
    control.markAsTouched();
    control.markAsDirty();
  }

  /**
   * clearServerError takes the rejection of the platform out of the control of
   * the address.
   */
  private clearServerError(): void {
    const control = this.form.controls.email;
    const errors = control.errors;
    if (!errors || !control.hasError(RECOVERY_LINK_SERVER_ERROR)) {
      return;
    }

    const { [RECOVERY_LINK_SERVER_ERROR]: _rejected, ...rest } = errors;
    control.setErrors(Object.keys(rest).length > 0 ? rest : null);
  }
}
