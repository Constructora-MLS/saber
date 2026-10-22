import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UpdateEmployeeCommandService } from '../../../application/command-services/employee-command-services';
import { EmployeeValidationError } from '../../../domain/model/errors/employee-errors';
import { REGIME_NAME_RESOLVER } from '../../../domain/services/regime-name-resolver';
import { EmployeeApiError } from '../../../infrastructure/http/employee-api.error';
import {
  birthDateFormatError,
  fromBirthDateInput,
  toBirthDateInput,
} from '../../date-format';

/**
 * birthDateValidator checks the date of birth that the worker wrote.
 *
 * The date is written in the format of Peru, so the value is read and
 * checked before it reaches the use case.
 */
function birthDateValidator(control: AbstractControl): ValidationErrors | null {
  const raw = String(control.value ?? '').trim();
  if (raw.length === 0) {
    return null;
  }

  const error = birthDateFormatError(raw);
  return error ? { birthDate: error } : null;
}

/**
 * EditableEmployee is the worker that a worker of the application asks to
 * modify.
 */
export interface EditableEmployee {
  /** The identifier of the worker. */
  readonly id: string;
  /** The first name of the worker. */
  readonly firstName: string;
  /** The last name of the worker. */
  readonly lastName: string;
  /** The identity document of the worker. */
  readonly dni: string;
  /** The labor regime of the worker. */
  readonly regimeId: string;
  /** The date of birth of the worker, in the YYYY-MM-DD format. */
  readonly birthDate: string;
}

/**
 * EditEmployeeDialog modifies the data of a worker of the platform.
 */
@Component({
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  selector: 'app-edit-employee-dialog',
  styleUrl: './edit-employee-dialog.scss',
  templateUrl: './edit-employee-dialog.html',
})
export class EditEmployeeDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly updateEmployee = inject(UpdateEmployeeCommandService);
  private readonly regimeNames = inject(REGIME_NAME_RESOLVER);
  private readonly dialogRef = inject<MatDialogRef<EditEmployeeDialog>>(MatDialogRef);

  /** The worker that is being modified. */
  protected readonly data = inject<EditableEmployee>(MAT_DIALOG_DATA);

  protected readonly form = this.formBuilder.nonNullable.group({
    dni: [this.data.dni, [Validators.required, Validators.pattern(/^\d{8}$/)]],
    firstName: [this.data.firstName, [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    lastName: [this.data.lastName, [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    birthDate: [toBirthDateInput(this.data.birthDate), [Validators.required, birthDateValidator]],
    regimeId: [this.data.regimeId, [Validators.required]],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly regimes = signal<readonly { id: string; name: string }[]>([]);
  protected readonly loadingRegimes = signal(true);

  constructor() {
    void this.loadRegimes();
  }

  /**
   * cancel closes the dialog without modifying the worker.
   */
  protected cancel(): void {
    this.dialogRef.close();
  }

  /**
   * submit applies the changes to the worker.
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

    const raw = this.form.getRawValue();

    try {
      const employee = await this.updateEmployee.execute({
        uuid: this.data.id,
        dni: raw.dni.trim(),
        firstName: raw.firstName.trim(),
        lastName: raw.lastName.trim(),
        birthDate: fromBirthDateInput(raw.birthDate) ?? '',
        regimeId: raw.regimeId,
      });
      this.dialogRef.close(employee);
    } catch (error) {
      this.errorMessage.set(this.describe(error));
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * loadRegimes asks the catalog for the regimes that the worker can
   * choose.
   */
  private async loadRegimes(): Promise<void> {
    try {
      this.regimes.set(await this.regimeNames.listRegimes());
    } catch {
      this.regimes.set([]);
    } finally {
      this.loadingRegimes.set(false);
    }
  }

  /**
   * describe turns a failure into the message the interfaces show.
   */
  private describe(error: unknown): string {
    if (error instanceof EmployeeApiError) {
      if (error.code === 'dni_already_exists') {
        return 'El DNI ya está registrado por otro trabajador.';
      }
      if (error.code === 'regime_not_found') {
        return 'El régimen seleccionado ya no está disponible.';
      }
      if (error.code === 'not_found') {
        return 'El trabajador ya no está registrado.';
      }
      return error.detail;
    }
    if (error instanceof EmployeeValidationError) {
      return error.reason;
    }
    return 'No se pudo actualizar el trabajador.';
  }
}
