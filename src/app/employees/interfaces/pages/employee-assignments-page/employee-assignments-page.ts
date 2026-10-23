// Package employeeassignmentspage shows the assignments of a worker.
//
// The page is the frontend controller of the Employees bounded context: it
// reads the record of the worker and the assignments of its labour periods
// through the use cases. It never talks to the API directly.
// package employeeassignmentspage

import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import {
  PersonSummary,
  PersonSummaryFact,
} from '../../components/person-summary/person-summary';
import { TableState } from '../../../../shared/interfaces/components/table-state/table-state';
import {
  GetWorkerRecordQueryService,
  ListAssignmentsQueryService,
  ListAssignmentOptionsQueryService,
  WorkerRecord,
} from '../../../application/query-services/assignment-query-services';
import {
  CeaseAssignmentCommandService,
  CreateAssignmentCommandService,
  DeleteAssignmentCommandService,
  UpdateAssignmentCommandService,
} from '../../../application/command-services/assignment-command-services';
import {
  CreateAssignmentCommand,
  UpdateAssignmentCommand,
} from '../../../application/commands/assignment-commands';
import { Assignment } from '../../../domain/model/aggregates/assignment';
import { AssignmentValidationError } from '../../../domain/model/errors/assignment-errors';
import {
  CATALOG_REFERENCE_RESOLVER,
  PositionReference,
  WorkUnitReference,
} from '../../../domain/services/catalog-reference-resolver';
import { AssignmentApiError } from '../../../infrastructure/http/assignment-api.error';
import { AssignmentRow, AssignmentTable } from '../../components/assignment-table/assignment-table';
import { CeaseAssignmentDialog } from '../../components/cease-assignment-dialog/cease-assignment-dialog';
import { CreateAssignmentDialog } from '../../components/create-assignment-dialog/create-assignment-dialog';
import { DeleteAssignmentDialog } from '../../components/delete-assignment-dialog/delete-assignment-dialog';
import {
  EditAssignmentDialog,
  EditableAssignment,
} from '../../components/edit-assignment-dialog/edit-assignment-dialog';
import {
  EditEmployeeDialog,
  EditableEmployee,
  EditEmployeeDialogResult,
} from '../../components/edit-employee-dialog/edit-employee-dialog';

/**
 * AssignmentLoadFailure is the failure of the consultation of the
 * assignments.
 *
 * The headline names what happened and the detail tells the worker what to
 * do about it, so the interface never shows a bare technical message.
 */
interface AssignmentLoadFailure {
  readonly title: string;
  readonly message: string;
}

/**
 * The size of the page of assignments.
 */
const PAGE_SIZE = 20;

/**
 * EmployeeAssignmentsPage shows the record of a worker and the assignments
 * of its labour periods.
 *
 * The page is the frontend controller of the bounded context: it reads the
 * listing of the assignments through the use cases and it resolves the names
 * of the references through the anti-corruption layer of the Catalog
 * context. It never talks to the API directly.
 */
@Component({
  imports: [
    AssignmentTable,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    PersonSummary,
    RouterLink,
    TableState,
  ],
  selector: 'app-employee-assignments-page',
  styleUrl: './employee-assignments-page.scss',
  templateUrl: './employee-assignments-page.html',
})
export class EmployeeAssignmentsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly listAssignments = inject(ListAssignmentsQueryService);
  private readonly getWorkerRecord = inject(GetWorkerRecordQueryService);
  private readonly listOptions = inject(ListAssignmentOptionsQueryService);
  private readonly catalog = inject(CATALOG_REFERENCE_RESOLVER);
  private readonly createAssignment = inject(CreateAssignmentCommandService);
  private readonly ceaseAssignment = inject(CeaseAssignmentCommandService);
  private readonly deleteAssignment = inject(DeleteAssignmentCommandService);
  private readonly updateAssignment = inject(UpdateAssignmentCommandService);

  /** The identifier of the worker that the address of the browser carries. */
  private employeeId = '';

  /** The record of the worker. */
  protected readonly worker = signal<WorkerRecord | null>(null);

  /** The assignments of the worker. */
  protected readonly rows = signal<readonly AssignmentRow[]>([]);

  /** The cursor of the next page of the listing. */
  protected readonly nextCursor = signal<string | null>(null);

  /** Whether the page is waiting for the answer of the platform. */
  protected readonly loading = signal(false);

  /** The failure that prevented the consultation. */
  protected readonly loadFailure = signal<AssignmentLoadFailure | null>(null);

  /**
   * Whether the worker of the ficha does not exist.
   *
   * The record is empty when the platform does not know the worker, and the
   * page says so instead of showing an empty listing.
   */
  protected readonly workerMissing = computed(
    () => !this.loading() && this.loadFailure() === null && this.worker() === null,
  );

  /**
   * The facts of the record, shown under the identity of the worker.
   */
  protected readonly facts = computed<readonly PersonSummaryFact[]>(() => {
    const worker = this.worker();
    if (!worker) {
      return [];
    }

    return [
      { label: 'Régimen', value: worker.regimeName ?? '—' },
      { label: 'Asignaciones', value: this.assignmentCountLabel() },
    ];
  });

  /**
   * The number of assignments of the worker, in the language of the
   * interfaces.
   */
  protected readonly assignmentCountLabel = computed(() => {
    const total = this.rows().length;
    const noun = total === 1 ? 'asignación' : 'asignaciones';

    return this.nextCursor()
      ? `${total} ${noun} cargadas`
      : `${total} ${noun} registradas`;
  });

  /**
   * The supporting text of the panel of the assignments.
   */
  protected readonly panelHint = computed(() => {
    const worker = this.worker();
    if (!worker) {
      return '';
    }

    return `Vigentes e históricas de ${worker.name}.`;
  });

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('employeeId') ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((employeeId) => {
        this.employeeId = employeeId;
        void this.reload();
      });
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
   * retry consults the assignments again.
   */
  protected retry(): void {
    void this.reload();
  }

  /**
   * openCreateDialog opens the dialog that registers an assignment.
   *
   * The catalogs are read before the dialog is opened: the form offers the
   * units of work and the positions that the platform publishes.
   */
  protected async openCreateDialog(): Promise<void> {
    const worker = this.worker();
    if (!worker) {
      return;
    }

    let options;
    try {
      options = await this.listOptions.execute();
    } catch {
      this.notify('No se pudieron leer los catálogos.');
      return;
    }

    this.dialog
      .open(CreateAssignmentDialog, {
        data: {
          worker: {
            name: worker.name,
            documentLabel: 'DNI',
            documentValue: worker.documentValue,
            statusLabel: worker.status === 'VIGENTE' ? 'Vigente' : 'Retirado',
          },
          workUnits: options.workUnits,
          positions: options.positions,
        },
        width: '38rem',
        maxWidth: '94vw',
      })
      .afterClosed()
      .subscribe((created) => {
        if (!created) {
          return;
        }

        void this.register(created);
      });
  }

  /**
   * openEditEmployeeDialog edits the worker from the current ficha.
   */
  protected openEditEmployeeDialog(): void {
    const worker = this.worker();
    if (!worker) {
      return;
    }

    const editable: EditableEmployee = {
      id: worker.id,
      firstName: worker.firstName,
      lastName: worker.lastName,
      dni: worker.documentValue,
      regimeId: worker.regimeId,
    };

    this.dialog
      .open<EditEmployeeDialog, EditableEmployee, EditEmployeeDialogResult>(EditEmployeeDialog, {
        data: editable,
        width: '38rem',
        maxWidth: '94vw',
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) {
          return;
        }

        const current = this.worker();
        if (!current) {
          return;
        }
        const employee = result.employee;
        this.worker.set({
          ...current,
          id: employee.id.value,
          name: employee.fullName,
          firstName: employee.firstName.value,
          lastName: employee.lastName.value,
          documentValue: employee.dni.value,
          regimeId: employee.regimeId.value,
          regimeName:
            result.regimeName ??
            (employee.regimeId.value === current.regimeId ? current.regimeName : null),
          status: employee.status,
        });
        this.notify('Trabajador actualizado.');
      });
  }

  /**
   * openEditAssignmentDialog opens the form for a vigente assignment.
   */
  protected async openEditAssignmentDialog(row: AssignmentRow): Promise<void> {
    const worker = this.worker();
    if (!worker) {
      return;
    }

    let options;
    try {
      options = await this.listOptions.execute();
    } catch {
      this.notify('No se pudieron leer los catálogos.');
      return;
    }

    const currentWorkUnit: WorkUnitReference = {
      id: row.workUnitId,
      name: row.workUnitName,
      code: row.workUnitCode ?? '—',
      serviceName: row.workUnitService ?? '—',
    };
    const currentPosition: PositionReference = { id: row.positionId, name: row.positionName };
    const workUnits = options.workUnits.some((item) => item.id === row.workUnitId)
      ? options.workUnits
      : [...options.workUnits, currentWorkUnit];
    const positions = options.positions.some((item) => item.id === row.positionId)
      ? options.positions
      : [...options.positions, currentPosition];

    this.dialog
      .open(EditAssignmentDialog, {
        data: {
          worker: {
            name: worker.name,
            documentLabel: 'DNI',
            documentValue: worker.documentValue,
            statusLabel: worker.status === 'VIGENTE' ? 'Vigente' : 'Retirado',
          },
          assignment: row,
          workUnits,
          positions,
        },
        width: '38rem',
        maxWidth: '94vw',
      })
      .afterClosed()
      .subscribe((command) => {
        if (command) {
          void this.update(command);
        }
      });
  }

  /**
   * openCeaseDialog opens the dialog that records the effective end date of
   * an assignment.
   */
  protected openCeaseDialog(row: AssignmentRow): void {
    const worker = this.worker();
    if (!worker) {
      return;
    }

    this.dialog
      .open(CeaseAssignmentDialog, {
        data: {
          worker: {
            name: worker.name,
            documentLabel: 'DNI',
            documentValue: worker.documentValue,
            statusLabel: worker.status === 'VIGENTE' ? 'Vigente' : 'Retirado',
          },
          assignment: {
            workUnitName: row.workUnitName,
            workUnitCode: row.workUnitCode,
            positionName: row.positionName,
            startDate: row.startDate,
          },
        },
        width: '34rem',
        maxWidth: '92vw',
      })
      .afterClosed()
      .subscribe((date) => {
        if (!date) {
          return;
        }

        void this.cease(row.id, date);
      });
  }

  /**
   * openDeleteDialog opens the dialog that deletes an assignment.
   */
  protected openDeleteDialog(row: AssignmentRow): void {
    this.dialog
      .open(DeleteAssignmentDialog, {
        data: {
          id: row.id,
          workUnitName: row.workUnitName,
          workUnitCode: row.workUnitCode,
          positionName: row.positionName,
        },
        width: '32rem',
        maxWidth: '92vw',
      })
      .afterClosed()
      .subscribe((deleted) => {
        if (!deleted) {
          return;
        }

        void this.remove(row.id);
      });
  }

  /**
   * goBack returns to the listing of the workers.
   */
  protected goBack(): void {
    void this.router.navigate(['/employees']);
  }

  /**
   * reload brings the first page of the assignments.
   */
  private async reload(): Promise<void> {
    this.nextCursor.set(null);
    await this.load(null, false);
  }

  /**
   * load asks the use cases for a page of the assignments.
   */
  private async load(cursor: string | null, append: boolean): Promise<void> {
    this.loading.set(true);
    this.loadFailure.set(null);

    try {
      const [record, page] = await Promise.all([
        this.getWorkerRecord.execute(this.employeeId),
        this.listAssignments.execute({
          employeeId: this.employeeId,
          cursor: cursor ?? undefined,
          limit: PAGE_SIZE,
        }),
      ]);

      this.worker.set(record);
      await this.publish(page.items, page.nextCursor, append);
    } catch (error) {
      this.loadFailure.set(this.describe(error));
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * publish stores the page that was read, with the names of the
   * references.
   */
  private async publish(
    assignments: readonly Assignment[],
    nextCursor: string | null,
    append: boolean,
  ): Promise<void> {
    const [workUnits, positions] = await Promise.all([
      this.resolveWorkUnits(assignments),
      this.resolvePositions(assignments),
    ]);

    const rows = assignments.map((assignment) => this.toRow(assignment, workUnits, positions));

    this.rows.set(append ? [...this.rows(), ...rows] : rows);
    this.nextCursor.set(nextCursor);
  }

  /**
   * resolveWorkUnits asks the catalog for the units of work of the
   * assignments.
   *
   * A failure of the catalog is not a failure of the listing: the names are
   * simply not resolved, and the assignments are shown with the references
   * they carry.
   */
  private async resolveWorkUnits(
    assignments: readonly Assignment[],
  ): Promise<ReadonlyMap<string, WorkUnitReference>> {
    const workUnitIds = [...new Set(assignments.map((item) => item.workUnitId.value))];

    try {
      return await this.catalog.resolveWorkUnits(workUnitIds);
    } catch {
      return new Map();
    }
  }

  /**
   * resolvePositions asks the catalog for the positions of the assignments.
   */
  private async resolvePositions(
    assignments: readonly Assignment[],
  ): Promise<ReadonlyMap<string, PositionReference>> {
    const positionIds = [...new Set(assignments.map((item) => item.positionId.value))];

    try {
      return await this.catalog.resolvePositions(positionIds);
    } catch {
      return new Map();
    }
  }

  /**
   * toRow presents an assignment in the table.
   */
  private toRow(
    assignment: Assignment,
    workUnits: ReadonlyMap<string, WorkUnitReference>,
    positions: ReadonlyMap<string, PositionReference>,
  ): AssignmentRow {
    const workUnit = workUnits.get(assignment.workUnitId.value);
    const position = positions.get(assignment.positionId.value);

    return {
      id: assignment.id.value,
      workUnitId: assignment.workUnitId.value,
      workUnitName: workUnit?.name ?? '—',
      workUnitCode: workUnit?.code ?? null,
      workUnitService: workUnit?.serviceName ?? null,
      positionId: assignment.positionId.value,
      positionName: position?.name ?? '—',
      startDate: assignment.startDate.value,
      endDate: assignment.endDate?.value ?? null,
      status: assignment.status,
    };
  }

  /**
   * register asks the platform for a new assignment and reads the listing
   * again.
   */
  private async register(command: CreateAssignmentCommand): Promise<void> {
    try {
      await this.createAssignment.execute({
        ...command,
        employeeId: this.employeeId,
      });
      this.notify('Asignación registrada.');
    } catch (error) {
      this.notify(this.describe(error).message);
      return;
    }

    await this.reload();
  }

  /**
   * update asks the platform to change assignment details and reads the
   * listing again.
   */
  private async update(command: UpdateAssignmentCommand): Promise<void> {
    try {
      await this.updateAssignment.execute(command);
      this.notify('Asignación actualizada.');
    } catch (error) {
      this.notify(this.describe(error).message);
      return;
    }

    await this.reload();
  }

  /**
   * cease asks the platform for the effective end date and reads the listing
   * again.
   */
  private async cease(id: string, date: string): Promise<void> {
    try {
      await this.ceaseAssignment.execute({ uuid: id, date });
      this.notify('Cese registrado.');
    } catch (error) {
      this.notify(this.describe(error).message);
      return;
    }

    await this.reload();
  }

  /**
   * remove asks the platform for the deletion of an assignment and reads
   * the listing again.
   */
  private async remove(id: string): Promise<void> {
    try {
      await this.deleteAssignment.execute({ uuid: id });
      this.notify('Asignación eliminada.');
    } catch (error) {
      this.notify(this.describe(error).message);
      return;
    }

    await this.reload();
  }

  /**
   * describe turns a failure into the state the interfaces show.
   *
   * The state names what happened, so the worker knows whether the service
   * is down, whether the platform rejected the operation or whether the
   * answer was not understood.
   */
  private describe(error: unknown): AssignmentLoadFailure {
    if (error instanceof AssignmentApiError) {
      if (error.status === 0) {
        return {
          title: 'No se pudo conectar con el servidor',
          message:
            'El servicio de asignaciones no respondió. Verifica que el servidor esté activo e inténtalo nuevamente.',
        };
      }

      if (error.status >= 500) {
        return {
          title: 'El servicio de asignaciones no está disponible',
          message: 'El servidor falló al responder. Inténtalo nuevamente en unos instantes.',
        };
      }

      if (error.code === 'unexpected_error') {
        return {
          title: 'No se pudieron cargar las asignaciones',
          message:
            'La plataforma no devolvió una respuesta válida. Inténtalo nuevamente en unos instantes.',
        };
      }

      return {
        title: 'No se pudieron cargar las asignaciones',
        message: error.detail,
      };
    }

    if (error instanceof AssignmentValidationError) {
      return {
        title: 'No se pudo completar la operación',
        message: error.reason,
      };
    }

    return {
      title: 'No se pudieron cargar las asignaciones',
      message:
        'Ocurrió un problema inesperado al consultar las asignaciones. Inténtalo nuevamente.',
    };
  }

  /**
   * notify shows the outcome of an action.
   */
  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
