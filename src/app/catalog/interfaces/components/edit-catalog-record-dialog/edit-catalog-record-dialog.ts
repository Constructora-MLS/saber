import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  UpdatePositionCommandService,
  UpdateRegimeCommandService,
  UpdateServiceCommandService,
  UpdateWorkUnitCommandService,
} from '../../../application/command-services/catalog-command-services';
import { normalizeCatalogSearch } from '../../../../shared/application/queries/catalog-search';
import { ListServicesQueryService } from '../../../application/query-services/catalog-query-services';
import { Position } from '../../../domain/model/aggregates/position';
import { Regime } from '../../../domain/model/aggregates/regime';
import { Service } from '../../../domain/model/aggregates/service';
import { WorkUnit } from '../../../domain/model/aggregates/work-unit';
import { CatalogValidationError } from '../../../domain/model/errors/catalog-errors';
import { UpdatableCatalogStatus } from '../../../domain/model/value-objects/catalog-status';
import {
  CATALOG_NAME_MAX_LENGTH,
  CATALOG_NAME_MIN_LENGTH,
} from '../../../domain/model/value-objects/catalog-name';
import { DESCRIPTION_MAX_LENGTH } from '../../../domain/model/value-objects/description';
import { CatalogApiError } from '../../../infrastructure/http/catalog-api.error';
import { FieldCounter } from '../../../../shared/interfaces/components/field-counter/field-counter';

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
 * ServiceOption is a service the worker can choose.
 *
 * The service of the work unit is always offered, even when it is not
 * active, so a work unit whose service was disabled later can still be
 * modified.
 */
interface ServiceOption {
  /** The identifier of the service. */
  readonly id: string;
  /** The name of the service. */
  readonly name: string;
  /** Whether the option is the service of the record. */
  readonly current: boolean;
}

/**
 * EditCatalogRecordDialog modifies a record of the catalog.
 */
@Component({
  imports: [
    FieldCounter,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
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
  private readonly destroyRef = inject(DestroyRef);

  /** The record that is being modified. */
  protected readonly data = inject<EditableCatalogRecord>(MAT_DIALOG_DATA);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

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
    // The identifier of the chosen service. It is the only mandatory field
    // of the reference: the text is only the label of the selection.
    serviceId: [''],
    // The text the worker types to find the service.
    serviceQuery: [''],
    status: ['ACTIVE' as UpdatableCatalogStatus, [Validators.required]],
  });

  protected readonly services = signal<readonly Service[]>([]);
  protected readonly selectedService = signal<ServiceOption | null>(null);
  protected readonly loadingServices = signal(false);
  protected readonly servicesError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** Whether the record is a work unit, the only one that belongs to a service. */
  protected readonly isWorkUnit = this.data.kind === 'work-unit';

  /** The service of the work unit, even when it is not active. */
  protected readonly currentService = computed<ServiceOption | null>(() => {
    if (!this.isWorkUnit) {
      return null;
    }
    const record = this.data as Extract<EditableCatalogRecord, { kind: 'work-unit' }>;
    return {
      id: record.record.serviceId,
      name: record.record.serviceName,
      current: true,
    };
  });

  /** The options of the selector: the service of the record and the active ones. */
  protected readonly serviceOptions = computed<readonly ServiceOption[]>(() => {
    const current = this.currentService();
    const active = this.services()
      .filter((service) => service.id !== current?.id)
      .map((service) => ({ id: service.id, name: service.name.value, current: false }));
    return current ? [current, ...active] : active;
  });

  constructor() {
    this.applyKind();
    this.patch();
  }

  ngOnInit(): void {
    if (!this.isWorkUnit) {
      return;
    }
    this.destroyRef.onDestroy(() => this.clearSearchTimer());
    void this.searchServices('');
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
   * onQueryChanged looks for the active services that match the term.
   *
   * The search settles first, so the catalog is not read on every keystroke.
   */
  protected onQueryChanged(event: Event): void {
    const term = (event.target as HTMLInputElement).value;

    const selected = this.selectedService();
    if (selected && term !== selected.name) {
      // The text no longer names the chosen service, so the choice is
      // dropped and the worker has to pick one again.
      this.selectedService.set(null);
      this.form.controls.serviceId.setValue('');
    }

    this.clearSearchTimer();
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      void this.searchServices(term);
    }, 300);
  }

  /**
   * selectService keeps the identifier of the chosen service and shows its
   * name in the field.
   */
  protected selectService(event: MatAutocompleteSelectedEvent): void {
    const id = event.option.value as string;
    const option = this.serviceOptions().find((item) => item.id === id);
    if (!option) {
      return;
    }
    this.selectedService.set(option);
    this.form.controls.serviceId.setValue(id);
    this.form.controls.serviceQuery.setValue(option.name);
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
    name: string;
    description: string;
    serviceId: string;
    serviceQuery: string;
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

    // The service is only sent when it changes, so the platform keeps the
    // current service and a work unit whose service was disabled later can
    // still be modified.
    const serviceId = raw.serviceId === data.record.serviceId ? undefined : raw.serviceId;

    const workUnit = await this.updateWorkUnit.execute({
      uuid: data.record.id,
      name: raw.name,
      description: raw.description,
      ...(serviceId ? { serviceId } : {}),
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
    this.form.controls.serviceId.setValidators([Validators.required]);
    this.form.controls.serviceId.updateValueAndValidity();
  }

  /**
   * patch fills the form with the values of the record.
   */
  private patch(): void {
    const data = this.data;

    if (data.kind === 'work-unit') {
      this.form.patchValue({
        name: data.record.name.value,
        description: data.record.description?.value ?? '',
        serviceId: data.record.serviceId,
        serviceQuery: data.record.serviceName,
        status: data.record.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
      });
      this.selectedService.set({
        id: data.record.serviceId,
        name: data.record.serviceName,
        current: true,
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
   * searchServices reads the active services that match the term.
   *
   * The platform only returns the active services, and the filter keeps the
   * rule even if the contract changes. The service of the record is always
   * offered, so it does not need to be active.
   */
  private async searchServices(term: string): Promise<void> {
    this.loadingServices.set(true);
    this.servicesError.set(null);
    try {
      const page = await this.listServices.execute({
        search: normalizeCatalogSearch(term),
        status: 'ACTIVE',
        limit: 20,
      });
      this.services.set(page.items.filter((service) => service.status === 'ACTIVE'));
    } catch {
      this.servicesError.set('No se pudieron cargar los servicios.');
    } finally {
      this.loadingServices.set(false);
    }
  }

  /**
   * clearSearchTimer cancels the pending search.
   */
  private clearSearchTimer(): void {
    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
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
