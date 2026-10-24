import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ListEmployeesQueryService } from '../../../application/query-services/employee-query-services';
import { Employee } from '../../../domain/model/aggregates/employee';
import { EmployeePage } from '../../../domain/repositories/employee-repositories';
import { CATALOG_REFERENCE_RESOLVER } from '../../../domain/services/catalog-reference-resolver';
import { EmployeeApiError } from '../../../infrastructure/http/employee-api.error';
import {
  DeleteEmployeeDialog,
  DeletableEmployee,
} from '../../components/delete-employee-dialog/delete-employee-dialog';
import {
  EditableEmployee,
  EditEmployeeDialog,
} from '../../components/edit-employee-dialog/edit-employee-dialog';
import { EmployeeRow, EmployeeTable } from '../../components/employee-table/employee-table';
import { Paginator } from '../../../../shared/interfaces/components/paginator/paginator';
import { RegisterEmployeeDialog } from '../../components/register-employee-dialog/register-employee-dialog';

/**
 * EmployeeLoadFailure is the failure of the consultation of the workers.
 *
 * The headline names what happened and the detail tells the worker what to
 * do about it, so the interface never shows a bare technical message.
 */
interface EmployeeLoadFailure {
  readonly title: string;
  readonly message: string;
}

/**
 * The size of the page of workers.
 */
const PAGE_SIZE = 20;

/**
 * EmployeesPage orchestrates the workers of the platform.
 *
 * The page is the frontend controller of the bounded context: it reads the
 * listings through the use cases and it resolves the names of the regimes
 * through the anti-corruption layer of the Catalog context. It never talks
 * to the API directly.
 */
@Component({
  imports: [
    EmployeeTable,
    FormsModule,
    Paginator,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  selector: 'app-employees-page',
  styleUrl: './employees-page.scss',
  templateUrl: './employees-page.html',
})
export class EmployeesPage implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly listEmployees = inject(ListEmployeesQueryService);
  private readonly catalog = inject(CATALOG_REFERENCE_RESOLVER);
  private readonly destroyRef = inject(DestroyRef);

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  /** The page that failed, so the retry asks for the same one. */
  private readonly failedPage = signal<number | null>(null);

  protected readonly searchTerm = signal('');
  protected readonly rows = signal<readonly EmployeeRow[]>([]);
  /** The number of the page that is shown, starting at one. */
  protected readonly page = signal(1);
  /** The number of pages of the listing. */
  protected readonly totalPages = signal(0);
  /** The number of records that match the query. */
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly loadFailure = signal<EmployeeLoadFailure | null>(null);

  /**
   * The headline of the state shown when the listing has no workers.
   *
   * A search without results and a catalog without workers are different
   * situations, so the state names the one that happened.
   */
  protected readonly emptyTitle = computed(() =>
    this.searchTerm().trim().length > 0
      ? 'Ningún trabajador coincide con la búsqueda'
      : 'Todavía no hay trabajadores registrados',
  );

  /**
   * The supporting text of the state shown when the listing has no workers.
   */
  protected readonly emptyMessage = computed(() =>
    this.searchTerm().trim().length > 0
      ? 'Prueba con otro nombre o con otro DNI.'
      : 'Registra al primer trabajador para verlo en esta lista.',
  );

  /**
   * The emblem of the state shown when the listing has no workers.
   *
   * The emblem is the one of the worker, never the one of the catalog: the
   * state belongs to the personal of the platform.
   */
  protected readonly emptyIcon = computed(() =>
    this.searchTerm().trim().length > 0 ? 'person_search' : 'group_off',
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
   * ngOnInit loads the listing of workers.
   *
   * The search lives in the page, never in the address of the browser, so
   * the url of the module stays clean and the menu keeps the item of the
   * page selected.
   */
  ngOnInit(): void {
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
   * goToPage shows another page of the listing.
   */
  protected goToPage(page: number): void {
    void this.load(page);
  }

  /**
   * retry consults the workers again.
   *
   * The page that failed is asked again, so the worker does not lose the
   * place that he was in.
   */
  protected retry(): void {
    void this.load(this.failedPage() ?? 1);
  }

  /**
   * openCreateDialog opens the dialog that registers a worker.
   */
  protected openCreateDialog(): void {
    this.dialog
      .open(RegisterEmployeeDialog, { width: '38rem', maxWidth: '94vw' })
      .afterClosed()
      .subscribe((created) => {
        if (created) {
          this.notify('Trabajador registrado.');
          void this.reload();
        }
      });
  }

  /**
   * openEditDialog opens the dialog that modifies a worker.
   */
  protected openEditDialog(row: EmployeeRow): void {
    const worker: EditableEmployee = {
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      dni: row.dni,
      regimeId: row.regimeId,
      regimeName: row.regimeName,
    };

    this.dialog
      .open(EditEmployeeDialog, { data: worker, width: '38rem', maxWidth: '94vw' })
      .afterClosed()
      .subscribe((updated) => {
        if (updated) {
          this.notify('Trabajador actualizado.');
          void this.reload();
        }
      });
  }

  /**
   * openDeleteDialog opens the dialog that deletes a worker.
   */
  protected openDeleteDialog(row: EmployeeRow): void {
    const worker: DeletableEmployee = { id: row.id, name: row.name };

    this.dialog
      .open(DeleteEmployeeDialog, { data: worker, width: '32rem', maxWidth: '92vw' })
      .afterClosed()
      .subscribe((deleted) => {
        if (deleted) {
          this.notify('Trabajador borrado.');
          void this.reload();
        }
      });
  }

  /**
   * reload brings the first page of the workers.
   */
  private async reload(): Promise<void> {
    await this.load(1);
  }

  /**
   * load asks the use case for a page of the workers.
   */
  private async load(page: number): Promise<void> {
    this.loading.set(true);
    this.loadFailure.set(null);

    try {
      const result = await this.listEmployees.execute({
        search: this.searchTerm().trim() || undefined,
        page,
        limit: PAGE_SIZE,
      });

      this.publish(result);
    } catch (error) {
      this.failedPage.set(page);
      this.loadFailure.set(this.describe(error));
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * publish stores the page that was read, with the names of the regimes.
   */
  private async publish(result: EmployeePage<Employee>): Promise<void> {
    const names = await this.resolveRegimeNames(result.items);
    this.rows.set(result.items.map((employee) => this.toRow(employee, names)));

    this.page.set(result.page);
    this.totalPages.set(result.totalPages);
    this.total.set(result.total);
    this.failedPage.set(null);
  }

  /**
   * resolveRegimeNames asks the catalog for the names of the regimes.
   *
   * The catalog is not the owner of this listing, so a failure of the
   * catalog only leaves the column without names.
   */
  private async resolveRegimeNames(
    employees: readonly Employee[],
  ): Promise<ReadonlyMap<string, string>> {
    const regimeIds = [...new Set(employees.map((employee) => employee.regimeId.value))];

    try {
      const regimes = await this.catalog.resolveRegimes(regimeIds);

      return new Map([...regimes].map(([id, regime]) => [id, regime.name]));
    } catch {
      return new Map();
    }
  }

  /**
   * toRow presents a worker in the table.
   */
  private toRow(employee: Employee, names: ReadonlyMap<string, string>): EmployeeRow {
    return {
      id: employee.id.value,
      firstName: employee.firstName.value,
      lastName: employee.lastName.value,
      name: employee.fullName,
      dni: employee.dni.value,
      regimeId: employee.regimeId.value,
      regimeName: names.get(employee.regimeId.value) ?? null,
      status: employee.status,
    };
  }

  /**
   * describe turns a failure into the state the interfaces show.
   *
   * The state names what happened, so the worker knows whether the service
   * is down, whether the platform rejected the query or whether the answer
   * was not understood.
   */
  private describe(error: unknown): EmployeeLoadFailure {
    if (error instanceof EmployeeApiError) {
      if (error.status === 0) {
        return {
          title: 'No se pudo conectar con el servidor',
          message:
            'El servicio de personal no respondió. Verifica que el servidor esté activo e inténtalo nuevamente.',
        };
      }

      if (error.status >= 500) {
        return {
          title: 'El servicio de personal no está disponible',
          message: 'El servidor falló al responder. Inténtalo nuevamente en unos instantes.',
        };
      }

      if (error.code === 'unexpected_error') {
        return {
          title: 'No se pudo cargar el personal',
          message:
            'La plataforma no devolvió una respuesta válida. Inténtalo nuevamente en unos instantes.',
        };
      }

      return {
        title: 'No se pudo cargar el personal',
        message: error.detail,
      };
    }

    return {
      title: 'No se pudo cargar el personal',
      message:
        'Ocurrió un problema inesperado al consultar los trabajadores. Inténtalo nuevamente.',
    };
  }

  /**
   * notify shows the outcome of an action.
   */
  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
