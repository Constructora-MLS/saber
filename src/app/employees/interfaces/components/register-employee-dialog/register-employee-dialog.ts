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
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CreateEmployeeCommandService } from '../../../application/command-services/employee-command-services';
import { EmployeeValidationError } from '../../../domain/model/errors/employee-errors';
import { EmployeeApiError } from '../../../infrastructure/http/employee-api.error';
import { REGIME_NAME_RESOLVER, RegimeOption } from '../../../domain/services/regime-name-resolver';
import { birthDateFormatError, fromBirthDateInput } from '../../date-format';

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
 * RegisterEmployeeDialog registers a worker of the platform.
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
  selector: 'app-register-employee-dialog',
  styleUrl: './register-employee-dialog.scss',
  templateUrl: './register-employee-dialog.html',
})
export class RegisterEmployeeDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly createEmployee = inject(CreateEmployeeCommandService);
  private readonly regimeNames = inject(REGIME_NAME_RESOLVER);
  private readonly dialogRef = inject<MatDialogRef<RegisterEmployeeDialog>>(MatDialogRef);

  protected readonly form = this.formBuilder.nonNullable.group({
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    birthDate: ['', [Validators.required, birthDateValidator]],
    regimeId: ['', [Validators.required]],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  /**
   * The regimes that the worker can choose.
   *
   * Only the available regimes are offered: the resolver never returns an
   * unavailable one.
   */
  protected readonly regimes = signal<readonly RegimeOption[]>([]);
  protected readonly loadingRegimes = signal(true);
  protected readonly regimeQuery = signal('');
  protected readonly filteredRegimes = computed(() => {
    const query = this.regimeQuery().trim().toLocaleLowerCase();
    return this.regimes()
      .filter(
        (regime) =>
          regime.availability === 'ACTIVE' && regime.name.toLocaleLowerCase().includes(query),
      )
      .slice(0, 20);
  });

  constructor() {
    void this.loadRegimes();
  }

  /**
   * cancel closes the dialog without registering the worker.
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
   * selectRegime stores the identifier of the chosen regime.
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
   * submit registers the worker.
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
      const employee = await this.createEmployee.execute({
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
      return error.detail;
    }
    if (error instanceof EmployeeValidationError) {
      return error.reason;
    }
    return 'No se pudo registrar el trabajador.';
  }
}
