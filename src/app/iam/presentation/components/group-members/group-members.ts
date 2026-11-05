import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Paginator } from '../../../../shared/presentation/components/paginator/paginator';
import { TableState } from '../../../../shared/presentation/components/table-state/table-state';
import { filterGroupMembers } from './group-members-model';

/**
 * GroupMemberRow is the presentation of an account that belongs to a role.
 */
export interface GroupMemberRow {
  /** The identifier of the account. */
  readonly id: string;
  /** The name of the account. */
  readonly name: string;
  /** The address of the account. */
  readonly email: string;
  /** Whether the account is the Owner of the platform. */
  readonly owner: boolean;
}

/**
 * GroupMembers shows the accounts that belong to a role.
 *
 * The component is presentational: it renders the members and it announces
 * the intention of the administrator through its outputs. It never talks to
 * the API.
 */
@Component({
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    Paginator,
    TableState,
  ],
  selector: 'app-group-members',
  styleUrl: './group-members.scss',
  templateUrl: './group-members.html',
})
export class GroupMembers {
  /** The members of the role. */
  readonly members = input.required<readonly GroupMemberRow[]>();
  /** Whether the members are being read. */
  readonly loading = input(false);
  /** The headline of the failure that prevented the consultation. */
  readonly failure = input<string | null>(null);
  /** The number of the page that is shown, starting at one. */
  readonly page = input(1);
  /** The number of pages of the listing. */
  readonly totalPages = input(0);
  /** Whether an operation of the page is in progress. */
  readonly busy = input(false);

  /** The removal of a member was requested. */
  readonly removeRequested = output<GroupMemberRow>();
  /** The addition of a member was requested. */
  readonly addRequested = output<void>();
  /** Another page of members was requested. */
  readonly pageRequested = output<number>();
  /** The consultation of the members was requested again. */
  readonly retryRequested = output<void>();

  /** The term that filters the members of the role. */
  protected readonly searchTerm = signal('');

  /**
   * visibleMembers are the members that match the term.
   *
   * The platform publishes the members of a role without a search, so the
   * term filters the members that the page already read.
   */
  protected readonly visibleMembers = computed(() =>
    filterGroupMembers(this.members(), this.searchTerm()),
  );

  /** onSearchChanged filters the members of the role. */
  protected onSearchChanged(term: string): void {
    this.searchTerm.set(term);
  }
}
