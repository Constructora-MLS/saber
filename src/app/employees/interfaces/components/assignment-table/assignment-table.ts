// Package assignmenttable shows the assignments of a worker.
// package assignmenttable

import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TableState } from '../../../../shared/interfaces/components/table-state/table-state';
import {
  AssignmentStatus,
  assignmentStatusLabel,
} from '../../../domain/model/value-objects/assignment-status';
import { AssignmentPeriod } from '../assignment-period/assignment-period';

/**
 * AssignmentRow is the presentation of an assignment of a worker.
 *
 * The row carries the names of the references of the assignment: the
 * Employees context knows the identifiers of the unit of work and of the
 * position, and the interfaces show the names that the catalogs publish.
 */
export interface AssignmentRow {
  /** The identifier of the assignment. */
  readonly id: string;
  /** The name of the unit of work. */
  readonly workUnitName: string;
  /** The code of the unit of work, when the catalog could be read. */
  readonly workUnitCode: string | null;
  /** The identifier of the unit of work. */
  readonly workUnitId: string;
  /** The service the unit of work belongs to, when the catalog could be read. */
  readonly workUnitService: string | null;
  /** The identifier of the position. */
  readonly positionId: string;
  /** The name of the position the worker performs. */
  readonly positionName: string;
  /** The date the labour period starts, in the YYYY-MM-DD format. */
  readonly startDate: string;
  /** The date the labour period was closed, in the YYYY-MM-DD format. */
  readonly endDate: string | null;
  /** The labour status of the assignment. */
  readonly status: AssignmentStatus;
}

/**
 * AssignmentTable shows the assignments of a worker.
 *
 * The table is presentational: it renders the assignments and it announces
 * the intention of the worker through its outputs. It never talks to the
 * API.
 */
@Component({
  imports: [
    AssignmentPeriod,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    TableState,
  ],
  selector: 'app-assignment-table',
  styleUrl: './assignment-table.scss',
  templateUrl: './assignment-table.html',
})
export class AssignmentTable {
  /** The caption of the table, read by the assistive technologies. */
  readonly caption = input.required<string>();
  /** The assignments of the worker. */
  readonly rows = input.required<readonly AssignmentRow[]>();
  /** Whether the table is waiting for the assignments. */
  readonly loading = input(false);
  /** The headline of the failure that prevented the consultation. */
  readonly errorTitle = input<string | null>(null);
  /** The detail of the failure that prevented the consultation. */
  readonly errorMessage = input<string | null>(null);
  /** The headline shown when the worker has no assignments. */
  readonly emptyTitle = input('Todavía no hay asignaciones registradas');
  /** The supporting text shown when the worker has no assignments. */
  readonly emptyMessage = input(
    'Registra la primera asignación para abrir el periodo de trabajo del trabajador.',
  );
  /** The emblem shown when the worker has no assignments. */
  readonly emptyIcon = input('assignment');
  /** The label of the action that offers to register an assignment. */
  readonly emptyActionLabel = input<string | null>(null);

  /** Editing an assignment was requested. */
  readonly editRequested = output<AssignmentRow>();
  /** The cessation of an assignment was requested. */
  readonly ceaseRequested = output<AssignmentRow>();
  /** The deletion of an assignment was requested. */
  readonly deleteRequested = output<AssignmentRow>();
  /** The certificate of an assignment was requested. */
  readonly certificateRequested = output<AssignmentRow>();
  /** The consultation of the assignments was requested again. */
  readonly retryRequested = output<void>();
  /** The registration of an assignment was requested. */
  readonly createRequested = output<void>();

  /**
   * statusLabel returns the label of a state in the language of the
   * interfaces.
   */
  protected statusLabel(status: AssignmentStatus): string {
    return assignmentStatusLabel(status);
  }

  /**
   * canCease reports whether the period of an assignment can be closed.
   *
   * The cessation closes a period that is open, so an assignment that is
   * already retired does not offer it.
   */
  protected canEdit(row: AssignmentRow): boolean {
    return row.status === 'VIGENTE';
  }

  /**
   * canCease reports whether the period can be given an end date.
   */
  protected canCease(row: AssignmentRow): boolean {
    return row.status === 'VIGENTE';
  }

  /**
   * canCertify reports whether the assignment may receive a certificate.
   *
   * A certificate archives a labour period, so only a closed period can
   * receive one.
   */
  protected canCertify(row: AssignmentRow): boolean {
    return row.status === 'RETIRADO';
  }
}
