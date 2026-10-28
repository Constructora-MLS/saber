import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
} from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CreateWorkUnitCommandService } from '../../../application/command-services/catalog-command-services';
import { CreateWorkUnitCommand } from '../../../application/commands/catalog-commands';
import { normalizeCatalogSearch } from '../../../../shared/application/queries/catalog-search';
import { ListServicesQueryService } from '../../../application/query-services/catalog-query-services';
import { Service } from '../../../domain/model/aggregates/service';
import { CatalogValidationError } from '../../../domain/model/errors/catalog-errors';
import {
  CATALOG_NAME_MAX_LENGTH,
  CATALOG_NAME_MIN_LENGTH,
} from '../../../domain/model/value-objects/catalog-name';
import { DESCRIPTION_MAX_LENGTH } from '../../../domain/model/value-objects/description';
import { CatalogApiError } from '../../../infrastructure/errors/catalog-api.error';
import { FieldCounter } from '../../../../shared/presentation/components/field-counter/field-counter';

/**
 * CreateWorkUnitDialog registers a work unit in the catalog.
 *
 * A work unit always belongs to an active service, so the selector only
 * offers the active services and it looks for them by name instead of
 * reading the whole catalog.
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
  selector: 'app-create-work-unit-dialog',
  styleUrl: './create-work-unit-dialog.scss',
  templateUrl: './create-work-unit-dialog.html',
})
export class CreateWorkUnitDialog implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly createWorkUnit = inject(CreateWorkUnitCommandService);
  private readonly listServices = inject(ListServicesQueryService);
  private readonly dialogRef = inject<MatDialogRef<CreateWorkUnitDialog>>(MatDialogRef);
  private readonly destroyRef = inject(DestroyRef);

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
    serviceId: ['', [Validators.required]],
    // The text the worker types to find the service.
    serviceQuery: [''],
  });

  protected readonly services = signal<readonly Service[]>([]);
  protected readonly selectedService = signal<Service | null>(null);
  protected readonly queryTerm = signal('');
  protected readonly loadingServices = signal(false);
  protected readonly servicesError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.clearSearchTimer());
    void this.searchServices('');
  }

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
    this.queryTerm.set(term);

    const selected = this.selectedService();
    if (selected && term !== selected.name.value) {
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
    const service = this.services().find((item) => item.id === id);
    if (!service) {
      return;
    }
    this.selectedService.set(service);
    this.form.controls.serviceId.setValue(id);
    this.form.controls.serviceQuery.setValue(service.name.value);
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
    name: string;
    description: string;
    serviceId: string;
    serviceQuery: string;
  }): CreateWorkUnitCommand {
    const description = raw.description.trim();
    return {
      name: raw.name.trim(),
      description: description.length > 0 ? description : null,
      serviceId: raw.serviceId,
    };
  }

  /**
   * searchServices reads the active services that match the term.
   *
   * The platform only returns the active services, and the filter keeps the
   * rule even if the contract changes.
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
