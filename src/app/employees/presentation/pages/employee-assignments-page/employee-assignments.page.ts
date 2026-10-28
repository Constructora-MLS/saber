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
import { PersonSummary, PersonSummaryFact } from '../../components/person-summary/person-summary';
import { TableState } from '../../../../shared/presentation/components/table-state/table-state';
import {
  GetWorkerRecordQueryService,
  ListAssignmentsQueryService,
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
import { AssignmentPage } from '../../../application/queries/assignment-queries';
import { AssignmentValidationError } from '../../../domain/model/errors/assignment-errors';
import {
  CATALOG_REFERENCE_RESOLVER,
  PositionReference,
  WorkUnitReference,
} from '../../../infrastructure/acl/catalog-reference.acl';
import { describeAssignmentFailure } from '../employee-failures';
import { AssignmentRow, AssignmentTable } from '../../components/assignment-table/assignment-table';
import { Paginator } from '../../../../shared/presentation/components/paginator/paginator';
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
    Paginator,
    MatDialogModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    PersonSummary,
    RouterLink,
    TableState,
  ],
  selector: 'app-employee-assignments-page',
  styleUrl: './employee-assignments.page.scss',
  templateUrl: './employee-assignments.page.html',
})
export class EmployeeAssignmentsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  private readonly listAssignments = inject(ListAssignmentsQueryService);
  private readonly getWorkerRecord = inject(GetWorkerRecordQueryService);
  private readonly catalog = inject(CATALOG_REFERENCE_RESOLVER);
  private readonly createAssignment = inject(CreateAssignmentCommandService);
  private readonly ceaseAssignment = inject(CeaseAssignmentCommandService);
  private readonly deleteAssignment = inject(DeleteAssignmentCommandService);
  private readonly updateAssignment = inject(UpdateAssignmentCommandService);

  /** The identifier of the worker that the address of the browser carries. */
  private employeeId = '';
  /** The page that failed, so the retry asks for the same one. */
  private readonly failedPage = signal<number | null>(null);

  /** The record of the worker. */
  protected readonly worker = signal<WorkerRecord | null>(null);

  /** The assignments of the worker. */
  protected readonly rows = signal<readonly AssignmentRow[]>([]);

  /** The number of the page that is shown, starting at one. */
  protected readonly page = signal(1);
  /** The number of pages of the listing. */
  protected readonly totalPages = signal(0);
  /** The number of records that match the query. */
  protected readonly total = signal(0);

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
    const total = this.total();
    const noun = total === 1 ? 'asignación' : 'asignaciones';

    return `${total} ${noun} registradas`;
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
   * goToPage shows another page of the listing.
   */
  protected goToPage(page: number): void {
    void this.load(page);
  }

  /**
   * retry consults the assignments again.
   *
   * The page that failed is asked again, so the worker does not lose the
   * place that he was in.
   */
  protected retry(): void {
    void this.load(this.failedPage() ?? 1);
  }

  /**
   * openCreateDialog opens the dialog that registers an assignment.
   *
   * The dialog looks for the units of work and the positions by itself, so
   * the page never downloads a whole catalog.
   */
  protected openCreateDialog(): void {
    const worker = this.worker();
    if (!worker) {
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
      regimeName: worker.regimeName,
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
  protected openEditAssignmentDialog(row: AssignmentRow): void {
    const worker = this.worker();
    if (!worker) {
      return;
    }

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
    await this.load(1);
  }

  /**
   * load asks the use cases for a page of the assignments.
   */
  private async load(page: number): Promise<void> {
    this.loading.set(true);
    this.loadFailure.set(null);

    try {
      const [record, result] = await Promise.all([
        this.getWorkerRecord.execute(this.employeeId),
        this.listAssignments.execute({
          employeeId: this.employeeId,
          page,
          limit: PAGE_SIZE,
        }),
      ]);

      this.worker.set(record);
      await this.publish(result);
    } catch (error) {
      this.failedPage.set(page);
      this.loadFailure.set(this.describe(error));
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * publish stores the page that was read, with the names of the
   * references.
   */
  private async publish(result: AssignmentPage<Assignment>): Promise<void> {
    const [workUnits, positions] = await Promise.all([
      this.resolveWorkUnits(result.items),
      this.resolvePositions(result.items),
    ]);

    this.rows.set(result.items.map((assignment) => this.toRow(assignment, workUnits, positions)));

    this.page.set(result.page);
    this.totalPages.set(result.totalPages);
    this.total.set(result.total);
    this.failedPage.set(null);
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
    if (error instanceof AssignmentValidationError) {
      return {
        title: 'No se pudo completar la operación',
        message: error.reason,
      };
    }
    return describeAssignmentFailure(error);
  }

  /**
   * notify shows the outcome of an action.
   */
  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
