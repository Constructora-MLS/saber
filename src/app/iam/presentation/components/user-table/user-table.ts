import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TableState } from '../../../../shared/presentation/components/table-state/table-state';
import { UserStatus, userStatusLabel } from '../../../domain/model/value-objects/user-status';

/**
 * UserRow is the presentation of an account of the platform.
 */
export interface UserRow {
  /** The identifier of the account. */
  readonly id: string;
  /** The name of the account, or its address when it has no name yet. */
  readonly name: string;
  /** The address of the account. */
  readonly email: string;
  /** The state of the account. */
  readonly status: UserStatus;
}

/**
 * UserTable shows the accounts of the platform.
 *
 * The table is presentational: it renders the records and it announces the
 * intention of the administrator through its outputs. It never talks to the
 * API.
 */
@Component({
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule, TableState],
  selector: 'app-user-table',
  styleUrl: './user-table.scss',
  templateUrl: './user-table.html',
})
export class UserTable {
  /** The caption of the table, read by the assistive technologies. */
  readonly caption = input.required<string>();
  /** The accounts of the page. */
  readonly rows = input.required<readonly UserRow[]>();
  /** Whether the table is waiting for the records. */
  readonly loading = input(false);
  /** The headline of the failure that prevented the consultation. */
  readonly errorTitle = input<string | null>(null);
  /** The detail of the failure that prevented the consultation. */
  readonly errorMessage = input<string | null>(null);
  /** The headline shown when the listing has no accounts. */
  readonly emptyTitle = input('Todavía no hay cuentas de acceso');
  /** The supporting text shown when the listing has no accounts. */
  readonly emptyMessage = input('Invita a la primera persona para verla en esta lista.');
  /** The emblem shown when the listing has no accounts. */
  readonly emptyIcon = input('group_off');
  /** The label of the action that offers to invite a person. */
  readonly emptyActionLabel = input<string | null>(null);

  /** The consultation was requested again. */
  readonly retryRequested = output<void>();
  /** The invitation of a person was requested. */
  readonly inviteRequested = output<void>();
  /** The deletion of an account was requested. */
  readonly deleteRequested = output<UserRow>();

  /**
   * statusLabel returns the label of a state in the language of the
   * interfaces.
   */
  protected statusLabel(status: UserStatus): string {
    return userStatusLabel(status);
  }
}
