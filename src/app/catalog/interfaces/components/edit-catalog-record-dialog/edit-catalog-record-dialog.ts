import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  UpdatePositionCommandService,
  UpdateRegimeCommandService,
  UpdateServiceCommandService,
  UpdateWorkUnitCommandService,
} from '../../../application/command-services/catalog-command-services';
import { ListServicesQueryService } from '../../../application/query-services/catalog-query-services';
import { Position } from '../../../domain/model/aggregates/position';
import { Regime } from '../../../domain/model/aggregates/regime';
import { Service } from '../../../domain/model/aggregates/service';
import { WorkUnit } from '../../../domain/model/aggregates/work-unit';
import { CatalogValidationError } from '../../../domain/model/errors/catalog-errors';
import { UpdatableCatalogStatus } from '../../../domain/model/value-objects/catalog-status';
import { CatalogApiError } from '../../../infrastructure/http/catalog-api.error';

/**
 * EditableCatalogRecord is the record that a worker of the application asks
 * to modify.
 *
 * The kind tells the dialog which fields the record carries, so the same
 * dialog edits the four catalogs of the context.
 */
export type EditableCatalogRecord =
  | { readonly kind: 'service'; readonly record: Service }
  | { readonly kind: 'position'; readonly record: Position }
  | { readonly kind: 'regime'; readonly record: Regime }
  | { readonly kind: 'work-unit'; readonly record: WorkUnit };

/**
 * EditCatalogRecordDialog modifies a record of the catalog.
 */
@Component({
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  selector: 'app-edit-catalog-record-dialog',
  styleUrl: './edit-catalog-record-dialog.scss',
  templateUrl: './edit-catalog-record-dialog.html',
})
export class EditCatalogRecordDialog implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly updateService = inject(UpdateServiceCommandService);
  private readonly updatePosition = inject(UpdatePositionCommandService);
  private readonly updateRegime = inject(UpdateRegimeCommandService);
  private readonly updateWorkUnit = inject(UpdateWorkUnitCommandService);
  private readonly listServices = inject(ListServicesQueryService);
  private readonly dialogRef =
    inject<MatDialogRef<EditCatalogRecordDialog, EditableCatalogRecord>>(MatDialogRef);

  /** The record that is being modified. */
  protected readonly data = inject<EditableCatalogRecord>(MAT_DIALOG_DATA);

  protected readonly form = this.formBuilder.nonNullable.group({
    code: [''],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(500)]],
    serviceId: [''],
    status: ['ACTIVE' as UpdatableCatalogStatus, [Validators.required]],
  });

  protected readonly services = signal<readonly Service[]>([]);
  protected readonly loadingServices = signal(false);
  protected readonly servicesError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** Whether the record is a work unit, the only one with a code and a service. */
  protected readonly isWorkUnit = this.data.kind === 'work-unit';

  constructor() {
    this.applyKind();
    this.patch();
  }

  ngOnInit(): void {
    if (!this.isWorkUnit) {
      return;
    }
    void this.loadServices();
  }

  /**
   * label returns the name of the record in the language of the interfaces.
   */
  protected label(): string {
    switch (this.data.kind) {
      case 'service':
        return 'el servicio';
      case 'position':
        return 'el cargo';
      case 'regime':
        return 'el régimen';
      case 'work-unit':
        return 'la unidad de trabajo';
    }
  }

  /**
   * cancel closes the dialog without modifying the record.
   */
  protected cancel(): void {
    this.dialogRef.close();
  }

  /**
   * submit applies the changes of the form to the record.
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
      const updated = await this.apply(raw);
      this.dialogRef.close(updated);
    } catch (error) {
      this.errorMessage.set(this.describe(error));
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * apply sends the changes of the form to the use case of the record.
   */
  private async apply(raw: {
    code: string;
    name: string;
    description: string;
    serviceId: string;
    status: UpdatableCatalogStatus;
  }): Promise<EditableCatalogRecord> {
    const data = this.data;

    if (data.kind === 'service') {
      const service = await this.updateService.execute({
        uuid: data.record.id,
        name: raw.name,
        description: raw.description,
        status: raw.status,
      });
      return { kind: 'service', record: service };
    }

    if (data.kind === 'position') {
      const position = await this.updatePosition.execute({
        uuid: data.record.id,
        name: raw.name,
        description: raw.description,
        status: raw.status,
      });
      return { kind: 'position', record: position };
    }

    if (data.kind === 'regime') {
      const regime = await this.updateRegime.execute({
        uuid: data.record.id,
        name: raw.name,
        description: raw.description,
        status: raw.status,
      });
      return { kind: 'regime', record: regime };
    }

    const workUnit = await this.updateWorkUnit.execute({
      uuid: data.record.id,
      code: raw.code,
      name: raw.name,
      description: raw.description,
      serviceId: raw.serviceId,
      status: raw.status,
    });
    return { kind: 'work-unit', record: workUnit };
  }

  /**
   * applyKind publishes the rules of the fields that only the work units
   * carry.
   */
  private applyKind(): void {
    if (!this.isWorkUnit) {
      return;
    }
    this.form.controls.code.setValidators([
      Validators.required,
      Validators.minLength(2),
      Validators.maxLength(40),
      Validators.pattern(/^[A-Za-z0-9-]+$/),
    ]);
    this.form.controls.serviceId.setValidators([Validators.required]);
    this.form.controls.code.updateValueAndValidity();
    this.form.controls.serviceId.updateValueAndValidity();
  }

  /**
   * patch fills the form with the values of the record.
   */
  private patch(): void {
    const data = this.data;

    if (data.kind === 'work-unit') {
      this.form.patchValue({
        code: data.record.code.value,
        name: data.record.name.value,
        description: data.record.description?.value ?? '',
        serviceId: data.record.serviceId,
        status: data.record.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
      });
      return;
    }

    this.form.patchValue({
      name: data.record.name.value,
      description: data.record.description?.value ?? '',
      status: data.record.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    });
  }

  /**
   * loadServices brings the services the work units belong to.
   *
   * The list carries the inactive services too, because a work unit can
   * belong to a service that was disabled after its creation.
   */
  private async loadServices(): Promise<void> {
    this.loadingServices.set(true);
    try {
      const page = await this.listServices.execute({ limit: 100 });
      this.services.set(page.items);
    } catch {
      this.servicesError.set('No se pudieron cargar los servicios.');
    } finally {
      this.loadingServices.set(false);
    }
  }

  /**
   * describe turns a failure into the message the interfaces show.
   */
  private describe(error: unknown): string {
    if (error instanceof CatalogApiError) {
      return error.detail;
    }
    if (error instanceof CatalogValidationError) {
      return error.reason;
    }
    return 'No se pudo guardar el registro.';
  }
}
