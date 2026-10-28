// Package editedmployeedialog modifies the data of a worker of the platform.
// package editedmployeedialog

import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UpdateEmployeeCommandService } from '../../../application/command-services/employee-command-services';
import { UpdateEmployeeCommand } from '../../../application/commands/employee-commands';
import { Employee } from '../../../domain/model/aggregates/employee';
import { EmployeeValidationError } from '../../../domain/model/errors/employee-errors';
import { DNI_LENGTH } from '../../../domain/model/value-objects/dni';
import {
  PERSON_NAME_MAX_LENGTH,
  PERSON_NAME_MIN_LENGTH,
} from '../../../domain/model/value-objects/person-name';
import { EmployeeApiError } from '../../../infrastructure/errors/employee-api.error';
import { describeEmployeeFailure, employeeFieldFailure } from '../../pages/employee-failures';
import { CATALOG_REFERENCE_RESOLVER } from '../../../infrastructure/acl/catalog-reference.acl';
import { FieldCounter } from '../../../../shared/presentation/components/field-counter/field-counter';
import {
  CatalogOption,
  CatalogSearchSelect,
} from '../../../../shared/presentation/components/catalog-search-select/catalog-search-select';

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
  /** The name of the labor regime of the worker, when it is known. */
  readonly regimeName: string | null;
}

/**
 * EditEmployeeDialog modifies the data of a worker of the platform.
 */
@Component({
  imports: [
    CatalogSearchSelect,
    FieldCounter,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
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
  private readonly dialogRef =
    inject<MatDialogRef<EditEmployeeDialog, EditEmployeeDialogResult | undefined>>(MatDialogRef);

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
  /** Whether the regimes are being read. */
  protected readonly loadingRegimes = signal(true);
  /** The failure that prevented the reading of the regimes. */
  protected readonly regimesError = signal<string | null>(null);

  /** The regimes that the platform offered. */
  private readonly found = signal<readonly CatalogOption[]>([]);
  /** The regime that the worker already carries. */
  private readonly current = signal<CatalogOption | null>(null);

  /**
   * The options of the selector: the regime of the record and the available
   * ones.
   */
  protected readonly regimes = computed<readonly CatalogOption[]>(() => {
    const current = this.current();
    const found = this.found();

    if (!current || found.some((option) => option.id === current.id)) {
      return found;
    }

    return [current, ...found];
  });

  constructor() {
    void this.loadCurrentRegime();
    void this.searchRegimes('');
  }

  /**
   * cancel closes the dialog without modifying the worker.
   */
  protected cancel(): void {
    this.dialogRef.close();
  }

  /**
   * searchRegimes reads the available regimes that match the term.
   */
  protected async searchRegimes(term: string): Promise<void> {
    this.loadingRegimes.set(true);
    this.regimesError.set(null);
    try {
      const regimes = await this.catalog.listRegimes(term);
      this.found.set(regimes.map((regime) => ({ id: regime.id, label: regime.name })));
    } catch {
      this.regimesError.set('No se pudieron leer los regímenes.');
    } finally {
      this.loadingRegimes.set(false);
    }
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
        this.regimes().find((option) => option.id === employee.regimeId.value)?.label ?? null;
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
   * loadCurrentRegime reads the regime that the worker already carries.
   *
   * The regime is asked by its identifier, so it is found even when it is
   * no longer available.
   */
  private async loadCurrentRegime(): Promise<void> {
    const id = this.data.regimeId;

    try {
      const name = this.data.regimeName ?? (await this.catalog.findRegime(id))?.name;
      if (name) {
        this.current.set({ id, label: name, current: true });
      }
    } catch {
      // The regime of the record is unknown: the form still shows the
      // available regimes.
    }
  }

  /**
   * describe turns a failure into the message the interfaces show.
   */
  private describe(error: unknown): string {
    if (error instanceof EmployeeApiError) {
      return employeeFieldFailure(error, ['dni', 'firstName', 'lastName', 'regimeId']) ??
        describeEmployeeFailure(error).message;
    }
    if (error instanceof EmployeeValidationError) {
      return error.reason;
    }
    return 'No se pudo actualizar el trabajador.';
  }
}
