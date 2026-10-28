import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CreateEmployeeCommandService } from '../../../application/command-services/employee-command-services';
import { EmployeeValidationError } from '../../../domain/model/errors/employee-errors';
import { DNI_LENGTH } from '../../../domain/model/value-objects/dni';
import {
  PERSON_NAME_MAX_LENGTH,
  PERSON_NAME_MIN_LENGTH,
} from '../../../domain/model/value-objects/person-name';
import { EmployeeApiError } from '../../../infrastructure/errors/employee-api.error';
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
 * RegisterEmployeeDialog registers a worker of the platform.
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
  selector: 'app-register-employee-dialog',
  styleUrl: './register-employee-dialog.scss',
  templateUrl: './register-employee-dialog.html',
})
export class RegisterEmployeeDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly createEmployee = inject(CreateEmployeeCommandService);
  private readonly catalog = inject(CATALOG_REFERENCE_RESOLVER);
  private readonly dialogRef = inject<MatDialogRef<RegisterEmployeeDialog>>(MatDialogRef);

  /** The limit of the DNI. */
  protected readonly dniLength = DNI_LENGTH;
  /** The shortest name that a worker accepts. */
  protected readonly personNameMinLength = PERSON_NAME_MIN_LENGTH;
  /** The limit of the first name and of the last name. */
  protected readonly personNameMaxLength = PERSON_NAME_MAX_LENGTH;

  protected readonly form = this.formBuilder.nonNullable.group({
    dni: ['', [Validators.required, Validators.pattern(DNI_PATTERN)]],
    firstName: [
      '',
      [
        Validators.required,
        Validators.minLength(PERSON_NAME_MIN_LENGTH),
        Validators.maxLength(PERSON_NAME_MAX_LENGTH),
      ],
    ],
    lastName: [
      '',
      [
        Validators.required,
        Validators.minLength(PERSON_NAME_MIN_LENGTH),
        Validators.maxLength(PERSON_NAME_MAX_LENGTH),
      ],
    ],
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
  protected readonly regimes = signal<readonly CatalogOption[]>([]);
  protected readonly loadingRegimes = signal(true);
  protected readonly regimesError = signal<string | null>(null);

  constructor() {
    void this.searchRegimes('');
  }

  /**
   * cancel closes the dialog without registering the worker.
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
      this.regimes.set(regimes.map((regime) => ({ id: regime.id, label: regime.name })));
    } catch {
      this.regimesError.set('No se pudieron leer los regímenes.');
    } finally {
      this.loadingRegimes.set(false);
    }
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
