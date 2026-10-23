import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { Employee } from '../../../domain/model/aggregates/employee';
import { EmployeeValidationError } from '../../../domain/model/errors/employee-errors';
import { DNI_LENGTH } from '../../../domain/model/value-objects/dni';
import {
  PERSON_NAME_MAX_LENGTH,
  PERSON_NAME_MIN_LENGTH,
} from '../../../domain/model/value-objects/person-name';
import {
  CATALOG_REFERENCE_RESOLVER,
  RegimeReference,
} from '../../../domain/services/catalog-reference-resolver';
import { EmployeeApiError } from '../../../infrastructure/http/employee-api.error';
import { FieldCounter } from '../../../../shared/interfaces/components/field-counter/field-counter';

/**
 * The pattern of a DNI: only digits, and exactly as many as the length of
 * the document.
 */
const DNI_PATTERN = new RegExp(`^\\d{${DNI_LENGTH}}$`);

/**
 * EditableEmployee is the worker that a worker of the application asks to
 * modify.
 */
export interface EditEmployeeDialogResult {
  readonly employee: Employee;
  readonly regimeName: string | null;
}

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
}

/**
 * EditEmployeeDialog modifies the data of a worker of the platform.
 */
@Component({
  imports: [
    FieldCounter,
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
  private readonly catalog = inject(CATALOG_REFERENCE_RESOLVER);
  private readonly dialogRef = inject<
    MatDialogRef<EditEmployeeDialog, EditEmployeeDialogResult | undefined>
  >(MatDialogRef);

  /** The worker that is being modified. */
  protected readonly data = inject<EditableEmployee>(MAT_DIALOG_DATA);

  /** The limit of the DNI. */
  protected readonly dniLength = DNI_LENGTH;
  /** The shortest name that a worker accepts. */
  protected readonly personNameMinLength = PERSON_NAME_MIN_LENGTH;
  /** The limit of the first name and of the last name. */
  protected readonly personNameMaxLength = PERSON_NAME_MAX_LENGTH;

  protected readonly form = this.formBuilder.nonNullable.group({
    dni: [this.data.dni, [Validators.required, Validators.pattern(DNI_PATTERN)]],
    firstName: [
      this.data.firstName,
      [
        Validators.required,
        Validators.minLength(PERSON_NAME_MIN_LENGTH),
        Validators.maxLength(PERSON_NAME_MAX_LENGTH),
      ],
    ],
    lastName: [
      this.data.lastName,
      [
        Validators.required,
        Validators.minLength(PERSON_NAME_MIN_LENGTH),
        Validators.maxLength(PERSON_NAME_MAX_LENGTH),
      ],
    ],
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
  protected readonly regimes = signal<readonly RegimeReference[]>([]);
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
      const regimeName =
        this.regimes().find((regime) => regime.id === employee.regimeId.value)?.name ?? null;
      this.dialogRef.close({ employee, regimeName });
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
    regimeId: string;
  }): UpdateEmployeeCommand {
    return {
      uuid: this.data.id,
      ...(raw.dni.trim() !== this.data.dni ? { dni: raw.dni.trim() } : {}),
      ...(raw.firstName.trim() !== this.data.firstName ? { firstName: raw.firstName.trim() } : {}),
      ...(raw.lastName.trim() !== this.data.lastName ? { lastName: raw.lastName.trim() } : {}),
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
      const available = await this.catalog.listRegimes();
      const current = this.data.regimeId;
      const currentRegime =
        available.find((regime) => regime.id === current) ??
        (await this.catalog.findRegime(current));

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
