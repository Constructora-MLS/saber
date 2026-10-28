import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
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
import { FilterableCatalogStatus } from '../../../domain/model/value-objects/catalog-status';
import { CatalogApiError } from '../../../infrastructure/errors/catalog-api.error';
import {
  CatalogColumn,
  CatalogRow,
  CatalogTable,
} from '../../components/catalog-table/catalog-table';
import { Paginator } from '../../../../shared/presentation/components/paginator/paginator';
import { CreatePositionDialog } from '../../components/create-position-dialog/create-position-dialog';
import { CreateRegimeDialog } from '../../components/create-regime-dialog/create-regime-dialog';
import { CreateServiceDialog } from '../../components/create-service-dialog/create-service-dialog';
import { CreateWorkUnitDialog } from '../../components/create-work-unit-dialog/create-work-unit-dialog';
import {
  DeletableCatalogRecord,
  DeleteCatalogRecordDialog,
} from '../../components/delete-catalog-record-dialog/delete-catalog-record-dialog';
import {
  EditableCatalogRecord,
  EditCatalogRecordDialog,
} from '../../components/edit-catalog-record-dialog/edit-catalog-record-dialog';

/**
 * CatalogListing is the pagination of a listing of the catalog.
 */
interface CatalogListing {
  /** The number of the page, starting at one. */
  readonly page: number;
  /** The number of pages of the listing. */
  readonly totalPages: number;
  /** The number of records that match the query. */
  readonly total: number;
}

/**
 * CatalogTab is the view of the catalog that is shown.
 */
type CatalogTab = 'servicios' | 'unidades' | 'cargos' | 'regimenes';

/**
 * The size of the page of records.
 *
 * Every request asks for twenty records: the listing never downloads more
 * than a page of the platform.
 */
const PAGE_SIZE = 20;

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
  /** The label of the search field of the listing. */
  readonly searchLabel: string;
  /** The placeholder of the search field of the listing. */
  readonly searchPlaceholder: string;
  readonly columns: readonly CatalogColumn[];
}

/**
 * isCatalogStatus reports whether a value is a state of a record.
 */
function isCatalogStatus(value: string | null): value is FilterableCatalogStatus {
  return value === 'ACTIVE' || value === 'INACTIVE';
}

/**
 * CatalogLoadFailure is the failure of the consultation of a catalog.
 *
 * The headline names what happened and the detail tells the worker what to
 * do about it, so the interface never shows a bare technical message.
 */
interface CatalogLoadFailure {
  readonly title: string;
  readonly message: string;
}

/**
 * CatalogPage orchestrates the catalogs of the platform.
 *
 * The page is the frontend controller of the bounded context: it reads the
 * listings through the use cases and it opens the dialogs that register,
 * modify and delete the records. It never talks to the API directly.
 */
@Component({
  imports: [
    CatalogTable,
    FormsModule,
    Paginator,
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
  styleUrl: './catalog.page.scss',
  templateUrl: './catalog.page.html',
})
export class CatalogPage implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly listServices = inject(ListServicesQueryService);
  private readonly listPositions = inject(ListPositionsQueryService);
  private readonly listRegimes = inject(ListRegimeQueryService);
  private readonly listWorkUnits = inject(ListWorkUnitsQueryService);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  /** The page that failed, so the retry asks for the same one. */
  private readonly failedPage = signal<number | null>(null);

  protected readonly tabs: readonly CatalogTabDefinition[] = [
    {
      id: 'unidades',
      label: 'Unidades de Trabajo',
      icon: 'account_tree',
      title: 'Unidades de Trabajo',
      subtitle: 'Obras y expedientes utilizados en las asignaciones.',
      createLabel: 'Registrar Unidad de Trabajo',
      recordsLabel: 'Unidades de trabajo registradas',
      searchLabel: 'Buscar por código o nombre',
      searchPlaceholder: 'Parte del código o nombre…',
      columns: [
        { header: 'Código', kind: 'code' },
        { header: 'Nombre', kind: 'name' },
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
      searchLabel: 'Buscar por nombre',
      searchPlaceholder: 'Nombre del cargo…',
      columns: [
        { header: 'Nombre', kind: 'name' },
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
      searchLabel: 'Buscar por nombre',
      searchPlaceholder: 'Nombre del régimen…',
      columns: [
        { header: 'Nombre', kind: 'name' },
        { header: 'Descripción', kind: 'description' },
        { header: 'Estado', kind: 'status' },
      ],
    },
    {
      id: 'servicios',
      label: 'Servicios',
      icon: 'domain',
      title: 'Servicios',
      subtitle: 'Conjunto de obras y expedientes que comparten un contrato.',
      createLabel: 'Registrar Servicio',
      recordsLabel: 'Servicios registrados',
      searchLabel: 'Buscar por nombre',
      searchPlaceholder: 'Nombre del servicio…',
      columns: [
        { header: 'Nombre', kind: 'name' },
        { header: 'Descripción', kind: 'description' },
        { header: 'Estado', kind: 'status' },
      ],
    },
  ];

  protected readonly activeTab = signal<CatalogTab>('unidades');
  protected readonly searchTerm = signal('');
  protected readonly statusFilter = signal<FilterableCatalogStatus | ''>('');
  protected readonly rows = signal<readonly CatalogRow[]>([]);
  protected readonly records = signal<ReadonlyMap<string, EditableCatalogRecord>>(new Map());
  /** The number of the page that is shown, starting at one. */
  protected readonly page = signal(1);
  /** The number of pages of the listing. */
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(false);
  protected readonly loadFailure = signal<CatalogLoadFailure | null>(null);

  protected readonly activeTabDefinition = computed(
    () => this.tabs.find((tab) => tab.id === this.activeTab()) ?? this.tabs[0],
  );

  constructor() {
    // The pending search is cancelled once, when the page goes away: the
    // callback is not registered on every keystroke.
    this.destroyRef.onDestroy(() => {
      if (this.searchTimer !== null) {
        clearTimeout(this.searchTimer);
        this.searchTimer = null;
      }
    });
  }

  /**
   * ngOnInit loads the listing of the catalog.
   *
   * The view, the filter and the search live in the page, never in the
   * address of the browser, so the url of the module stays clean and the
   * menu keeps the item of the page selected.
   */
  ngOnInit(): void {
    void this.reload();
  }

  /**
   * activateTab shows one of the views of the catalog and reloads it.
   */
  protected activateTab(tab: CatalogTab): void {
    if (tab === this.activeTab()) {
      return;
    }
    this.activeTab.set(tab);
    this.loadFailure.set(null);
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
  }

  /**
   * onStatusChanged reloads the listing with the new filter.
   */
  protected onStatusChanged(value: FilterableCatalogStatus | ''): void {
    this.statusFilter.set(value);
    void this.reload();
  }

  /**
   * clearSearch empties the search of the listing.
   */
  protected clearSearch(): void {
    if (this.searchTerm().length === 0) {
      return;
    }
    this.searchTerm.set('');
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
   * goToPage shows another page of the listing.
   */
  protected goToPage(page: number): void {
    void this.load(page);
  }

  /**
   * retry consults the catalog again.
   *
   * The page that failed is asked again, so the worker does not lose the
   * place that he was in.
   */
  protected retry(): void {
    void this.load(this.failedPage() ?? 1);
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
        .subscribe((created) => {
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
            this.notify(`Unidad de trabajo registrada con el código ${created.code.value}.`);
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
   * openEditDialog opens the dialog that modifies a record of the active
   * catalog.
   */
  protected openEditDialog(row: CatalogRow): void {
    const record = this.records().get(row.id);
    if (!record) {
      this.notify('El registro ya no está en el catálogo.');
      void this.reload();
      return;
    }

    this.dialog
      .open(EditCatalogRecordDialog, { data: record, width: '34rem', maxWidth: '92vw' })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) {
          this.notify('Registro actualizado.');
          void this.reload();
        }
      });
  }

  /**
   * openDeleteDialog opens the dialog that deletes a record of the active
   * catalog.
   */
  protected openDeleteDialog(row: CatalogRow): void {
    const record = this.records().get(row.id);
    if (!record) {
      this.notify('El registro ya no está en el catálogo.');
      void this.reload();
      return;
    }

    const data: DeletableCatalogRecord = {
      kind: record.kind,
      id: record.record.id,
      name: record.record.name.value,
    };

    this.dialog
      .open(DeleteCatalogRecordDialog, { data, width: '30rem', maxWidth: '92vw' })
      .afterClosed()
      .subscribe((deleted) => {
        if (deleted) {
          this.notify('Registro borrado.');
          void this.reload();
        }
      });
  }

  /**
   * reload brings the first page of the active catalog.
   */
  private async reload(): Promise<void> {
    await this.load(1);
  }

  /**
   * load asks the use case for a page of the active catalog.
   */
  private async load(page: number): Promise<void> {
    this.loading.set(true);
    this.loadFailure.set(null);

    try {
      const tab = this.activeTab();
      const search = this.searchTerm().trim();
      const status = this.statusFilter();

      if (tab === 'servicios') {
        const result = await this.listServices.execute({
          search: search || undefined,
          status: status || undefined,
          limit: PAGE_SIZE,
          page,
        });
        this.publish(
          result.items.map((service) => ({ kind: 'service', record: service }) as const),
          result,
        );
        return;
      }

      if (tab === 'unidades') {
        const result = await this.listWorkUnits.execute({
          search: search || undefined,
          status: status || undefined,
          limit: PAGE_SIZE,
          page,
        });
        this.publish(
          result.items.map((unit) => ({ kind: 'work-unit', record: unit }) as const),
          result,
        );
        return;
      }

      if (tab === 'cargos') {
        const result = await this.listPositions.execute({
          search: search || undefined,
          status: status || undefined,
          limit: PAGE_SIZE,
          page,
        });
        this.publish(
          result.items.map((position) => ({ kind: 'position', record: position }) as const),
          result,
        );
        return;
      }

      const result = await this.listRegimes.execute({
        search: search || undefined,
        status: status || undefined,
        limit: PAGE_SIZE,
        page,
      });
      this.publish(
        result.items.map((regime) => ({ kind: 'regime', record: regime }) as const),
        result,
      );
    } catch (error) {
      this.failedPage.set(page);
      this.loadFailure.set(this.describe(error));
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * publish stores the page that was read.
   */
  private publish(records: readonly EditableCatalogRecord[], result: CatalogListing): void {
    this.rows.set(records.map((record) => this.toRow(record)));

    this.records.set(new Map(records.map((record) => [record.record.id, record])));

    this.page.set(result.page);
    this.totalPages.set(result.totalPages);
    this.failedPage.set(null);
  }

  /**
   * toRow presents a record of the catalog in the table.
   */
  private toRow(record: EditableCatalogRecord): CatalogRow {
    switch (record.kind) {
      case 'service':
        return {
          id: record.record.id,
          code: null,
          name: record.record.name.value,
          description: record.record.description?.value ?? null,
          reference: null,
          status: record.record.status,
        };
      case 'position':
        return {
          id: record.record.id,
          code: null,
          name: record.record.name.value,
          description: record.record.description?.value ?? null,
          reference: null,
          status: record.record.status,
        };
      case 'regime':
        return {
          id: record.record.id,
          code: null,
          name: record.record.name.value,
          description: record.record.description?.value ?? null,
          reference: null,
          status: record.record.status,
        };
      case 'work-unit':
        return {
          id: record.record.id,
          code: record.record.code.value,
          name: record.record.name.value,
          description: record.record.description?.value ?? null,
          reference: record.record.serviceName,
          status: record.record.status,
        };
    }
  }

  /**
   * describe turns a failure into the state the interfaces show.
   *
   * The state names what happened, so the worker knows whether the service
   * is down, whether the platform rejected the query or whether the answer
   * was not understood.
   */
  private describe(error: unknown): CatalogLoadFailure {
    if (error instanceof CatalogApiError) {
      if (error.status === 0) {
        return {
          title: 'No se pudo conectar con el servidor',
          message:
            'El servicio de catálogos no respondió. Verifica que el servidor esté activo e inténtalo nuevamente.',
        };
      }

      if (error.status >= 500) {
        return {
          title: 'El servicio de catálogos no está disponible',
          message: 'El servidor falló al responder. Inténtalo nuevamente en unos instantes.',
        };
      }

      if (error.code === 'unexpected_error') {
        return {
          title: 'No se pudo cargar el catálogo',
          message:
            'La plataforma no devolvió una respuesta válida. Inténtalo nuevamente en unos instantes.',
        };
      }

      return {
        title: 'No se pudo cargar el catálogo',
        message: error.detail,
      };
    }

    return {
      title: 'No se pudo cargar el catálogo',
      message: 'Ocurrió un problema inesperado al consultar los registros. Inténtalo nuevamente.',
    };
  }

  /**
   * notify shows the outcome of an action.
   */
  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
