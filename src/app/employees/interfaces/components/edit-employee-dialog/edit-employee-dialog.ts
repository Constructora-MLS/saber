import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UpdateEmployeeCommandService } from '../../../application/command-services/employee-command-services';
import { UpdateEmployeeCommand } from '../../../application/commands/employee-commands';
import { EmployeeValidationError } from '../../../domain/model/errors/employee-errors';
import { REGIME_NAME_RESOLVER, RegimeOption } from '../../../domain/services/regime-name-resolver';
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
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
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
  /**
   * The regimes that the worker can choose.
   *
   * The regime that the worker already carries stays in the list even when
   * it is no longer available, so the form never loses the value of the
   * record that it modifies.
   */
  protected readonly regimes = signal<readonly RegimeOption[]>([]);
  protected readonly loadingRegimes = signal(true);
  protected readonly regimeQuery = signal('');
  protected readonly filteredRegimes = computed(() => {
    const query = this.regimeQuery().trim().toLocaleLowerCase();
    return this.regimes()
      .filter(
        (regime) =>
          (regime.availability === 'ACTIVE' || regime.id === this.data.regimeId) &&
          regime.name.toLocaleLowerCase().includes(query),
      )
      .slice(0, 20);
  });

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
   * onRegimeQueryChanged filters the regimes as the worker types.
   */
  protected onRegimeQueryChanged(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.regimeQuery.set(query);

    const selected = this.regimes().find(
      (regime) => regime.id === this.form.controls.regimeId.value,
    );
    if (selected && query !== selected.name) {
      this.form.controls.regimeId.setValue('');
    }
  }

  /**
   * selectRegime stores the identifier of the chosen active regime.
   */
  protected selectRegime(event: MatAutocompleteSelectedEvent): void {
    const id = event.option.value as string;
    const regime = this.regimes().find((item) => item.id === id && item.availability === 'ACTIVE');
    if (!regime) {
      return;
    }

    this.form.controls.regimeId.setValue(id);
    this.regimeQuery.set(regime.name);
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
      const employee = await this.updateEmployee.execute(this.toCommand(raw));
      this.dialogRef.close(employee);
    } catch (error) {
      this.errorMessage.set(this.describe(error));
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * toCommand builds the command of the use case with the fields that
   * changed.
   *
   * The platform keeps the fields that the command does not carry, so a
   * worker whose regime is no longer available can still be modified.
   */
  private toCommand(raw: {
    dni: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    regimeId: string;
  }): UpdateEmployeeCommand {
    const birthDate = fromBirthDateInput(raw.birthDate) ?? '';

    return {
      uuid: this.data.id,
      ...(raw.dni.trim() !== this.data.dni ? { dni: raw.dni.trim() } : {}),
      ...(raw.firstName.trim() !== this.data.firstName ? { firstName: raw.firstName.trim() } : {}),
      ...(raw.lastName.trim() !== this.data.lastName ? { lastName: raw.lastName.trim() } : {}),
      ...(birthDate !== this.data.birthDate ? { birthDate } : {}),
      ...(raw.regimeId !== this.data.regimeId ? { regimeId: raw.regimeId } : {}),
    };
  }

  /**
   * loadRegimes asks the catalog for the regimes that the worker can
   * choose.
   *
   * The regime that the worker already carries is added when it is not
   * offered any more, so the selection always shows what the record holds.
   */
  private async loadRegimes(): Promise<void> {
    try {
      const available = await this.regimeNames.listRegimes();
      const current = this.data.regimeId;
      const currentRegime =
        available.find((regime) => regime.id === current) ??
        (await this.regimeNames.findRegime(current));

      this.regimes.set(
        currentRegime && !available.some((regime) => regime.id === currentRegime.id)
          ? [...available, currentRegime]
          : available,
      );
      this.regimeQuery.set(currentRegime?.name ?? '');
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
