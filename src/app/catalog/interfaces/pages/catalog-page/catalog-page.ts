import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  ListPositionsQueryService,
  ListRegimeQueryService,
  ListServicesQueryService,
  ListWorkUnitsQueryService,
} from '../../../application/query-services/catalog-query-services';
import { Service } from '../../../domain/model/aggregates/service';
import { CatalogStatus } from '../../../domain/model/value-objects/catalog-status';
import { CatalogApiError } from '../../../infrastructure/http/catalog-api.error';
import {
  CatalogColumn,
  CatalogRow,
  CatalogTable,
} from '../../components/catalog-table/catalog-table';
import { CreatePositionDialog } from '../../components/create-position-dialog/create-position-dialog';
import { CreateRegimeDialog } from '../../components/create-regime-dialog/create-regime-dialog';
import { CreateServiceDialog } from '../../components/create-service-dialog/create-service-dialog';
import { CreateWorkUnitDialog } from '../../components/create-work-unit-dialog/create-work-unit-dialog';

/**
 * CatalogTab is the view of the catalog that is shown.
 */
type CatalogTab = 'servicios' | 'unidades' | 'cargos' | 'regimenes';

/**
 * CatalogTabDefinition describes one of the views of the catalog.
 */
interface CatalogTabDefinition {
  readonly id: CatalogTab;
  readonly label: string;
  readonly icon: string;
  readonly title: string;
  readonly subtitle: string;
  readonly createLabel: string;
  readonly recordsLabel: string;
  readonly columns: readonly CatalogColumn[];
}

/**
 * CatalogPage orchestrates the catalogs of the platform.
 *
 * The page is the frontend controller of the bounded context: it reads the
 * listings through the use cases and it opens the dialogs that register the
 * records. It never talks to the API directly.
 */
@Component({
  imports: [
    CatalogTable,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  selector: 'app-catalog-page',
  styleUrl: './catalog-page.scss',
  templateUrl: './catalog-page.html',
})
export class CatalogPage {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly listServices = inject(ListServicesQueryService);
  private readonly listPositions = inject(ListPositionsQueryService);
  private readonly listRegimes = inject(ListRegimeQueryService);
  private readonly listWorkUnits = inject(ListWorkUnitsQueryService);

  private readonly serviceNames = new Map<string, string>();
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly tabs: readonly CatalogTabDefinition[] = [
    {
      id: 'unidades',
      label: 'Unidades de Trabajo',
      icon: 'account_tree',
      title: 'Unidades de Trabajo',
      subtitle: 'Obras y expedientes utilizados en las asignaciones.',
      createLabel: 'Registrar Unidad de Trabajo',
      recordsLabel: 'Unidades de trabajo registradas',
      columns: [
        { header: 'Código', kind: 'code' },
        { header: 'Denominación', kind: 'name' },
        { header: 'Servicio', kind: 'reference' },
        { header: 'Estado', kind: 'status' },
      ],
    },
    {
      id: 'cargos',
      label: 'Cargos',
      icon: 'work',
      title: 'Cargos',
      subtitle: 'Funciones que ocupan los trabajadores en sus asignaciones.',
      createLabel: 'Registrar Cargo',
      recordsLabel: 'Cargos registrados',
      columns: [
        { header: 'Denominación', kind: 'name' },
        { header: 'Descripción', kind: 'description' },
        { header: 'Estado', kind: 'status' },
      ],
    },
    {
      id: 'regimenes',
      label: 'Regímenes',
      icon: 'list_alt',
      title: 'Regímenes',
      subtitle: 'Regímenes laborales disponibles para las asignaciones.',
      createLabel: 'Registrar Régimen',
      recordsLabel: 'Regímenes registrados',
      columns: [
        { header: 'Denominación', kind: 'name' },
        { header: 'Descripción', kind: 'description' },
        { header: 'Estado', kind: 'status' },
      ],
    },
    {
      id: 'servicios',
      label: 'Servicios',
      icon: 'domain',
      title: 'Servicios',
      subtitle: 'Familias de obras y expedientes que comparten el mismo contrato.',
      createLabel: 'Registrar Servicio',
      recordsLabel: 'Servicios registrados',
      columns: [
        { header: 'Nombre', kind: 'name' },
        { header: 'Descripción', kind: 'description' },
        { header: 'Estado', kind: 'status' },
      ],
    },
  ];

  protected readonly activeTab = signal<CatalogTab>('unidades');
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<CatalogStatus | ''>('');
  protected readonly rows = signal<readonly CatalogRow[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly activeTabDefinition = computed(
    () => this.tabs.find((tab) => tab.id === this.activeTab()) ?? this.tabs[0],
  );

  constructor() {
    void this.reload();
  }

  /**
   * activateTab shows one of the views of the catalog and reloads it.
   */
  protected activateTab(tab: CatalogTab): void {
    if (this.activeTab() === tab) {
      return;
    }
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    void this.reload();
  }

  /**
   * onSearchChanged reloads the listing after the search settles.
   */
  protected onSearchChanged(value: string): void {
    this.searchTerm.set(value);
    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      void this.reload();
    }, 300);
    this.destroyRef.onDestroy(() => {
      if (this.searchTimer !== null) {
        clearTimeout(this.searchTimer);
        this.searchTimer = null;
      }
    });
  }

  /**
   * onStatusChanged reloads the listing with the new filter.
   */
  protected onStatusChanged(value: CatalogStatus | ''): void {
    this.statusFilter.set(value);
    void this.reload();
  }

  /**
   * clearFilters removes the filters of the listing.
   */
  protected clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('');
    void this.reload();
  }

  /**
   * loadMore brings the next page of the listing.
   */
  protected async loadMore(): Promise<void> {
    const cursor = this.nextCursor();
    if (!cursor) {
      return;
    }
    await this.load(cursor, true);
  }

  /**
   * openCreateDialog opens the dialog that registers a record of the active
   * catalog.
   */
  protected openCreateDialog(): void {
    const tab = this.activeTab();

    if (tab === 'servicios') {
      this.dialog
        .open(CreateServiceDialog, { width: '34rem', maxWidth: '92vw' })
        .afterClosed()
        .subscribe((created?: Service) => {
          if (created) {
            this.notify('Servicio registrado.');
            void this.reload();
          }
        });
      return;
    }

    if (tab === 'unidades') {
      this.dialog
        .open(CreateWorkUnitDialog, { width: '34rem', maxWidth: '92vw' })
        .afterClosed()
        .subscribe((created) => {
          if (created) {
            this.notify('Unidad de trabajo registrada.');
            void this.reload();
          }
        });
      return;
    }

    if (tab === 'cargos') {
      this.dialog
        .open(CreatePositionDialog, { width: '34rem', maxWidth: '92vw' })
        .afterClosed()
        .subscribe((created) => {
          if (created) {
            this.notify('Cargo registrado.');
            void this.reload();
          }
        });
      return;
    }

    this.dialog
      .open(CreateRegimeDialog, { width: '34rem', maxWidth: '92vw' })
      .afterClosed()
      .subscribe((created) => {
        if (created) {
          this.notify('Régimen registrado.');
          void this.reload();
        }
      });
  }

  /**
   * reload brings the first page of the active catalog.
   */
  private async reload(): Promise<void> {
    this.nextCursor.set(null);
    await this.load(null, false);
  }

  /**
   * load asks the use case for a page of the active catalog.
   */
  private async load(cursor: string | null, append: boolean): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const tab = this.activeTab();
      const search = this.searchTerm().trim();
      const status = this.statusFilter();

      if (tab === 'servicios') {
        const page = await this.listServices.execute({
          search: search || undefined,
          status: status || undefined,
          cursor: cursor ?? undefined,
        });
        this.serviceNames.clear();
        for (const service of page.items) {
          this.serviceNames.set(service.id, service.name.value);
        }
        this.publish(
          page.items.map((service) => this.toServiceRow(service)),
          page.nextCursor,
          append,
        );
        return;
      }

      if (tab === 'unidades') {
        await this.loadServiceNames();
        const page = await this.listWorkUnits.execute({
          search: search || undefined,
          status: status || undefined,
          cursor: cursor ?? undefined,
        });
        this.publish(
          page.items.map((unit) => this.toWorkUnitRow(unit)),
          page.nextCursor,
          append,
        );
        return;
      }

      if (tab === 'cargos') {
        const page = await this.listPositions.execute({
          search: search || undefined,
          status: status || undefined,
          cursor: cursor ?? undefined,
        });
        this.publish(
          page.items.map((position) => this.toPositionRow(position)),
          page.nextCursor,
          append,
        );
        return;
      }

      const page = await this.listRegimes.execute({
        search: search || undefined,
        status: status || undefined,
        cursor: cursor ?? undefined,
      });
      this.publish(
        page.items.map((regime) => this.toRegimeRow(regime)),
        page.nextCursor,
        append,
      );
    } catch (error) {
      this.errorMessage.set(this.describe(error));
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * loadServiceNames keeps the names of the services, so the listing of the
   * work units can show the service of every unit.
   */
  private async loadServiceNames(): Promise<void> {
    const page = await this.listServices.execute({ status: 'ACTIVE', limit: 100 });
    this.serviceNames.clear();
    for (const service of page.items) {
      this.serviceNames.set(service.id, service.name.value);
    }
  }

  /**
   * publish stores the page that was read.
   */
  private publish(rows: readonly CatalogRow[], nextCursor: string | null, append: boolean): void {
    this.rows.set(append ? [...this.rows(), ...rows] : rows);
    this.nextCursor.set(nextCursor);
  }

  private toServiceRow(service: Service): CatalogRow {
    return {
      id: service.id,
      code: null,
      name: service.name.value,
      description: service.description?.value ?? null,
      reference: null,
      status: service.status,
    };
  }

  private toWorkUnitRow(unit: {
    id: string;
    code: { value: string };
    name: { value: string };
    description: { value: string } | null;
    serviceId: string;
    status: CatalogStatus;
  }): CatalogRow {
    return {
      id: unit.id,
      code: unit.code.value,
      name: unit.name.value,
      description: unit.description?.value ?? null,
      reference: this.serviceNames.get(unit.serviceId) ?? null,
      status: unit.status,
    };
  }

  private toPositionRow(position: {
    id: string;
    name: { value: string };
    description: { value: string } | null;
    status: CatalogStatus;
  }): CatalogRow {
    return {
      id: position.id,
      code: null,
      name: position.name.value,
      description: position.description?.value ?? null,
      reference: null,
      status: position.status,
    };
  }

  private toRegimeRow(regime: {
    id: string;
    name: { value: string };
    description: { value: string } | null;
    status: CatalogStatus;
  }): CatalogRow {
    return {
      id: regime.id,
      code: null,
      name: regime.name.value,
      description: regime.description?.value ?? null,
      reference: null,
      status: regime.status,
    };
  }

  private describe(error: unknown): string {
    if (error instanceof CatalogApiError) {
      return error.detail;
    }
    return 'No se pudo cargar el catálogo.';
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
