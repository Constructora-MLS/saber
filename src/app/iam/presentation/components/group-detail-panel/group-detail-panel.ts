import { Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UpdateGroupCommand } from '../../../application/commands/group-commands';
import { Group } from '../../../domain/model/aggregates/group';
import { GroupMembers, GroupMemberRow } from '../group-members/group-members';
import { GroupRoleForm, GroupRoleView } from '../group-role-form/group-role-form';

/**
 * GroupDetailView is the view of the role that the panel shows.
 *
 * The views are the ones that the administrator needs: the data of the
 * role, the permissions that it grants and the members that receive them.
 */
export type GroupDetailView = 'datos' | 'permisos' | 'miembros';

/** GroupDetailViewDefinition describes one of the views of the role. */
export interface GroupDetailViewDefinition {
  /** The identifier of the view. */
  readonly id: GroupDetailView;
  /** The name that the worker reads. */
  readonly label: string;
  /** The symbol that represents the view. */
  readonly icon: string;
}

/**
 * GroupDetailPanel shows the role that the administrator is configuring.
 *
 * The panel is presentational: it shows the three views of the role and it
 * announces the intention of the administrator through its outputs. It
 * never talks to the API.
 */
@Component({
  imports: [GroupMembers, GroupRoleForm, MatButtonModule, MatIconModule],
  selector: 'app-group-detail-panel',
  styleUrl: './group-detail-panel.scss',
  templateUrl: './group-detail-panel.html',
})
export class GroupDetailPanel {
  /** The role that the panel is configuring. */
  readonly group = input.required<Group>();
  /** The members of the role. */
  readonly members = input.required<readonly GroupMemberRow[]>();
  /** Whether the members are being read. */
  readonly membersLoading = input(false);
  /** The message of the failure of the read of the members. */
  readonly membersFailure = input<string | null>(null);
  /** The number of the page of members that is shown. */
  readonly membersPage = input(1);
  /** The number of pages of the members. */
  readonly membersTotalPages = input(0);
  /** A localized failure while saving the role. */
  readonly saveFailure = input<string | null>(null);
  /** Whether an operation is in progress. */
  readonly busy = input(false);

  /** The change of the role was requested. */
  readonly saveRequested = output<UpdateGroupCommand>();
  /** Closing the panel was requested. */
  readonly closeRequested = output<void>();
  /** The form has a net change from the role that the platform published. */
  readonly pendingChangesChange = output<boolean>();
  /** The removal of a member was requested. */
  readonly memberRemoveRequested = output<GroupMemberRow>();
  /** The addition of a member was requested. */
  readonly memberAddRequested = output<void>();
  /** Another page of members was requested. */
  readonly membersPageRequested = output<number>();
  /** The consultation of the members was requested again. */
  readonly membersRetryRequested = output<void>();

  /** The views of the role, in the order they are offered. */
  protected readonly views = computed<readonly GroupDetailViewDefinition[]>(() => [
    { id: 'datos', label: 'Datos', icon: 'badge' },
    { id: 'permisos', label: 'Permisos', icon: 'shield' },
    { id: 'miembros', label: 'Miembros', icon: 'group' },
  ]);

  /** The view that the panel shows. */
  readonly activeView = signal<GroupDetailView>('datos');

  /** activateView shows one of the views of the role. */
  activateView(view: GroupDetailView): void {
    this.activeView.set(view);
  }
}
