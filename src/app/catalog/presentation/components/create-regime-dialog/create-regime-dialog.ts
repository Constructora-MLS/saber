import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CreateRegimeCommandService } from '../../../application/command-services/catalog-command-services';
import { CreateRegimeCommand } from '../../../application/commands/catalog-commands';
import { CatalogValidationError } from '../../../domain/model/errors/catalog-errors';
import {
  CATALOG_NAME_MAX_LENGTH,
  CATALOG_NAME_MIN_LENGTH,
} from '../../../domain/model/value-objects/catalog-name';
import { DESCRIPTION_MAX_LENGTH } from '../../../domain/model/value-objects/description';
import { catalogApiErrorMessage, catalogFieldErrors } from '../../catalog-error-messages';
import { FieldCounter } from '../../../../shared/presentation/components/field-counter/field-counter';

/**
 * CreateRegimeDialog registers a regime in the catalog.
 */
@Component({
  imports: [
    FieldCounter,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  selector: 'app-create-regime-dialog',
  styleUrl: './create-regime-dialog.scss',
  templateUrl: './create-regime-dialog.html',
})
export class CreateRegimeDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly createRegime = inject(CreateRegimeCommandService);
  private readonly dialogRef = inject<MatDialogRef<CreateRegimeDialog>>(MatDialogRef);

  /** The shortest name that a record accepts. */
  protected readonly nameMinLength = CATALOG_NAME_MIN_LENGTH;
  /** The limit of the name of the record. */
  protected readonly nameMaxLength = CATALOG_NAME_MAX_LENGTH;
  /** The limit of the description of the record. */
  protected readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;

  protected readonly form = this.formBuilder.nonNullable.group({
    name: [
      '',
      [
        Validators.required,
        Validators.minLength(CATALOG_NAME_MIN_LENGTH),
        Validators.maxLength(CATALOG_NAME_MAX_LENGTH),
      ],
    ],
    description: ['', [Validators.maxLength(DESCRIPTION_MAX_LENGTH)]],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly serverFieldErrors = signal<Readonly<Record<string, string>>>({});

  protected fieldError(field: string): string | null {
    return this.serverFieldErrors()[field] ?? null;
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

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
    this.serverFieldErrors.set({});

    const command = this.toCommand(this.form.getRawValue());

    try {
      const regime = await this.createRegime.execute(command);
      this.dialogRef.close(regime);
    } catch (error) {
      this.serverFieldErrors.set(catalogFieldErrors(error, ['name', 'description']));
      this.errorMessage.set(this.describe(error));
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * toCommand transforms the values of the form into the command of the
   * use case.
   */
  private toCommand(raw: { name: string; description: string }): CreateRegimeCommand {
    const description = raw.description.trim();
    return {
      name: raw.name.trim(),
      description: description.length > 0 ? description : null,
    };
  }

  private describe(error: unknown): string {
    if (error instanceof CatalogValidationError) {
      return error.reason;
    }
    return catalogApiErrorMessage(error, 'No se pudo registrar el régimen.');
  }
}
