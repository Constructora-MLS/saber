import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { TableState } from '../../../../shared/interfaces/components/table-state/table-state';
import {
  EmployeeStatus,
  employeeStatusLabel,
} from '../../../domain/model/value-objects/employee-status';

/**
 * EmployeeRow is the presentation of a worker of the platform.
 */
export interface EmployeeRow {
  /** The identifier of the worker. */
  readonly id: string;
  /** The first name of the worker. */
  readonly firstName: string;
  /** The last name of the worker. */
  readonly lastName: string;
  /** The full name of the worker. */
  readonly name: string;
  /** The identity document of the worker. */
  readonly dni: string;
  /** The reference to the labor regime of the worker. */
  readonly regimeId: string;
  /** The name of the labor regime, when the catalog could be read. */
  readonly regimeName: string | null;
  /** The state of the worker. */
  readonly status: EmployeeStatus;
}

/**
 * EmployeeTable shows the workers of the platform.
 *
 * The table is presentational: it renders the records and it announces the
 * intention of the worker through its outputs. It never talks to the API.
 */
@Component({
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    RouterLink,
    TableState,
  ],
  selector: 'app-employee-table',
  styleUrl: './employee-table.scss',
  templateUrl: './employee-table.html',
})
export class EmployeeTable {
  /** The caption of the table, read by the assistive technologies. */
  readonly caption = input.required<string>();
  /** The workers of the page. */
  readonly rows = input.required<readonly EmployeeRow[]>();
  /** Whether the table is waiting for the records. */
  readonly loading = input(false);
  /** The headline of the failure that prevented the consultation. */
  readonly errorTitle = input<string | null>(null);
  /** The detail of the failure that prevented the consultation. */
  readonly errorMessage = input<string | null>(null);
  /** The headline shown when the listing has no workers. */
  readonly emptyTitle = input('Todavía no hay trabajadores registrados');
  /** The supporting text shown when the listing has no workers. */
  readonly emptyMessage = input('Registra al primer trabajador para verlo en esta lista.');
  /** The emblem shown when the listing has no workers. */
  readonly emptyIcon = input('group_off');
  /** The label of the action that offers to register a worker. */
  readonly emptyActionLabel = input<string | null>(null);

  /** The consultation was requested again. */
  readonly retryRequested = output<void>();
  /** The edition of a worker was requested. */
  readonly editRequested = output<EmployeeRow>();
  /** The deletion of a worker was requested. */
  readonly deleteRequested = output<EmployeeRow>();
  /** The registration of a worker was requested. */
  readonly createRequested = output<void>();

  /**
   * statusLabel returns the label of a state in the language of the
   * interfaces.
   */
  protected statusLabel(status: EmployeeStatus): string {
    return employeeStatusLabel(status);
  }
}
