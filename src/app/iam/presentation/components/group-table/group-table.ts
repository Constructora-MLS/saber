import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDragPreview,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TableState } from '../../../../shared/presentation/components/table-state/table-state';

/**
 * GroupRow is the presentation of a group of the organization.
 */
export interface GroupRow {
  /** The identifier of the group. */
  readonly id: string;
  /** The name of the group. */
  readonly name: string;
  /** The color that identifies the group. */
  readonly color: string;
}

/**
 * GroupTable shows the roles of the organization.
 *
 * The table is presentational: it renders the roles and it announces the
 * intention of the administrator through its outputs. The order of the
 * hierarchy is kept by the drag and drop, and the table never talks to the
 * API.
 */
@Component({
  imports: [
    CdkDrag,
    CdkDragHandle,
    CdkDragPreview,
    CdkDropList,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    TableState,
  ],
  selector: 'app-group-table',
  styleUrl: './group-table.scss',
  templateUrl: './group-table.html',
})
export class GroupTable {
  /** The caption of the table, read by the assistive technologies. */
  readonly caption = input('Roles de la organización');
  /** The roles of the hierarchy, from the highest priority to the lowest. */
  readonly rows = input.required<readonly GroupRow[]>();
  /** Whether the table is waiting for the records. */
  readonly loading = input(false);
  /** The headline of the failure that prevented the consultation. */
  readonly errorTitle = input<string | null>(null);
  /** The detail of the failure that prevented the consultation. */
  readonly errorMessage = input<string | null>(null);
  /** The headline shown when the listing has no roles. */
  readonly emptyTitle = input('Todavía no hay grupos');
  /** The supporting text shown when the listing has no roles. */
  readonly emptyMessage = input('Crea un grupo para organizar el acceso a la plataforma.');
  /** The emblem shown when the listing has no roles. */
  readonly emptyIcon = input('group_off');
  /** The label of the action that offers to register a role. */
  readonly emptyActionLabel = input<string | null>(null);
  /** Whether the hierarchy can be reordered. */
  readonly canReorder = input(false);
  /** Whether an operation of the page is in progress. */
  readonly busy = input(false);

  /** The edition of a role was requested. */
  readonly editRequested = output<GroupRow>();
  /** The deletion of a role was requested. */
  readonly deleteRequested = output<GroupRow>();
  /** The hierarchy was reordered. */
  readonly reorderRequested = output<readonly string[]>();
  /** The consultation of the roles was requested again. */
  readonly retryRequested = output<void>();
  /** The registration of a role was requested. */
  readonly createRequested = output<void>();

  /** onDrop announces the new order of the hierarchy. */
  protected onDrop(event: CdkDragDrop<readonly GroupRow[]>): void {
    if (!this.canReorder() || event.previousIndex === event.currentIndex) {
      return;
    }
    const next = [...this.rows()];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.reorderRequested.emit(next.map((row) => row.id));
  }
}
