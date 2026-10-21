import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CreateWorkUnitCommandService } from '../../../application/command-services/catalog-command-services';
import { CreateWorkUnitCommand } from '../../../application/commands/catalog-commands';
import { ListServicesQueryService } from '../../../application/query-services/catalog-query-services';
import { Service } from '../../../domain/model/aggregates/service';
import { CatalogValidationError } from '../../../domain/model/errors/catalog-errors';
import { CatalogApiError } from '../../../infrastructure/http/catalog-api.error';

/**
 * CreateWorkUnitDialog registers a work unit in the catalog.
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
  selector: 'app-create-work-unit-dialog',
  styleUrl: './create-work-unit-dialog.scss',
  templateUrl: './create-work-unit-dialog.html',
})
export class CreateWorkUnitDialog implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly createWorkUnit = inject(CreateWorkUnitCommandService);
  private readonly listServices = inject(ListServicesQueryService);
  private readonly dialogRef = inject<MatDialogRef<CreateWorkUnitDialog>>(MatDialogRef);

  protected readonly form = this.formBuilder.nonNullable.group({
    code: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(40),
        Validators.pattern(/^[A-Za-z0-9-]+$/),
      ],
    ],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(500)]],
    serviceId: ['', [Validators.required]],
  });

  protected readonly services = signal<readonly Service[]>([]);
  protected readonly loadingServices = signal(true);
  protected readonly servicesError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    void this.loadServices();
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

    const command = this.toCommand(this.form.getRawValue());

    try {
      const workUnit = await this.createWorkUnit.execute(command);
      this.dialogRef.close(workUnit);
    } catch (error) {
      this.errorMessage.set(this.describe(error));
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * toCommand transforms the values of the form into the command of the
   * use case.
   */
  private toCommand(raw: {
    code: string;
    name: string;
    description: string;
    serviceId: string;
  }): CreateWorkUnitCommand {
    const description = raw.description.trim();
    return {
      code: raw.code.trim(),
      name: raw.name.trim(),
      description: description.length > 0 ? description : null,
      serviceId: raw.serviceId,
    };
  }

  private async loadServices(): Promise<void> {
    this.loadingServices.set(true);
    this.servicesError.set(null);
    try {
      const page = await this.listServices.execute({ limit: 100 });
      this.services.set(page.items);
    } catch {
      this.servicesError.set('No se pudieron cargar los servicios.');
    } finally {
      this.loadingServices.set(false);
    }
  }

  private describe(error: unknown): string {
    if (error instanceof CatalogApiError) {
      return error.detail;
    }
    if (error instanceof CatalogValidationError) {
      return error.reason;
    }
    return 'No se pudo registrar la unidad de trabajo.';
  }
}
