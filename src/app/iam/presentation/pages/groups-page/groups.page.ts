import { Component, computed, DestroyRef, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  DeleteGroupCommandService,
  ReorderGroupsCommandService,
} from '../../../application/command-services/group-command-services';
import { ListGroupsQueryService } from '../../../application/query-services/group-query-services';
import { Group } from '../../../domain/model/aggregates/group';
import { GroupPriority } from '../../../domain/model/value-objects/group-priority';
import { CreateGroupDialog } from '../../components/create-group-dialog/create-group-dialog';
import {
  DeletableGroup,
  DeleteGroupDialog,
} from '../../components/delete-group-dialog/delete-group-dialog';
import { GroupRow, GroupTable } from '../../components/group-table/group-table';
import { TableState } from '../../../../shared/presentation/components/table-state/table-state';
import { describeGroupFailure, GroupFailureMessage, isGroupConflict } from '../group-failures';

/** The API page size covers the backend's complete active-group limit. */
const GROUP_LIST_LIMIT = 100;
/** Akame permits at most fifty active groups. */
const MAX_ACTIVE_GROUPS = 50;
/** The groups endpoint accepts search terms between two and 120 code points. */
const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_LENGTH = 120;

/** GroupsPage orchestrates the read and the management of the group hierarchy. */
@Component({
  imports: [
    FormsModule,
    GroupTable,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSnackBarModule,
    TableState,
  ],
  selector: 'app-groups-page',
  styleUrl: './groups.page.scss',
  templateUrl: './groups.page.html',
})
export class GroupsPage implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly listGroups = inject(ListGroupsQueryService);
  private readonly deleteGroupCommand = inject(DeleteGroupCommandService);
  private readonly reorderGroups = inject(ReorderGroupsCommandService);

  private listRequest = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private reloadAfterMutation = false;
  private readonly groupsHeading = viewChild<ElementRef<HTMLElement>>('groupsHeading');

  protected readonly searchTerm = signal('');
  protected readonly groups = signal<readonly Group[]>([]);
  protected readonly listComplete = signal(false);
  protected readonly loading = signal(true);
  protected readonly loadFailure = signal<GroupFailureMessage | null>(null);
  protected readonly actionFailure = signal<GroupFailureMessage | null>(null);
  protected readonly reordering = signal(false);
  protected readonly deletingId = signal<string | null>(null);

  /** The roles of the hierarchy, ready to be shown in the table. */
  protected readonly rows = computed<readonly GroupRow[]>(() =>
    this.groups().map((group) => ({ id: group.id, name: group.name, color: group.color })),
  );

  /** Whether the current search excludes some of the full hierarchy. */
  protected readonly filtered = computed(() => this.searchTerm().trim().length > 0);
  /** A search term outside the bounds published by Akame's listing contract. */
  protected readonly searchValidationMessage = computed(() => {
    const length = [...this.searchTerm().trim()].length;
    if (length > 0 && length < MIN_SEARCH_LENGTH) {
      return `Escribe al menos ${MIN_SEARCH_LENGTH} caracteres para buscar.`;
    }
    if (length > MAX_SEARCH_LENGTH) {
      return `La búsqueda no puede superar ${MAX_SEARCH_LENGTH} caracteres.`;
    }
    return null;
  });
  /** The headline of the state shown when the listing has no roles. */
  protected readonly emptyTitle = computed(() => {
    if (this.searchValidationMessage()) {
      return 'Búsqueda no válida';
    }
    return this.filtered()
      ? 'Ningún grupo coincide con la búsqueda'
      : 'Todavía no hay grupos';
  });
  /** The supporting text of the state shown when the listing has no roles. */
  protected readonly emptyMessage = computed(() => {
    const validation = this.searchValidationMessage();
    if (validation) {
      return validation;
    }
    return this.filtered()
      ? 'Prueba con otro nombre.'
      : 'Crea un grupo para organizar el acceso a la plataforma.';
  });
  /** The emblem of the state shown when the listing has no roles. */
  protected readonly emptyIcon = computed(() => (this.filtered() ? 'search_off' : 'group_off'));
  /** The label of the action that offers to register a role. */
  protected readonly emptyActionLabel = computed(() =>
    this.filtered() || this.searchValidationMessage() ? null : 'Crear grupo',
  );
  /** Whether a reorder request can include the entire unfiltered hierarchy. */
  protected readonly canReorder = computed(
    () =>
      !this.loading() &&
      !this.reordering() &&
      this.deletingId() === null &&
      this.listComplete() &&
      !this.filtered() &&
      this.groups().length > 1,
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.clearSearchTimer());
  }

  ngOnInit(): void {
    void this.loadGroups();
  }

  /** onSearchChanged queries the API after the term settles. */
  protected onSearchChanged(value: string): void {
    this.searchTerm.set(value);
    this.clearSearchTimer();
    this.listRequest += 1;
    this.loadFailure.set(null);

    if (this.searchValidationMessage()) {
      this.groups.set([]);
      this.listComplete.set(false);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      void this.loadGroups();
    }, 300);
  }

  /** clearSearch removes the search term and immediately reads the full hierarchy. */
  protected clearSearch(): void {
    if (this.searchTerm().length === 0) {
      return;
    }
    this.searchTerm.set('');
    this.clearSearchTimer();
    void this.loadGroups();
  }

  /** openCreateGroup opens the dialog that registers a group. */
  protected openCreateGroup(): void {
    if (this.isMutationInProgress()) {
      return;
    }

    this.dialog
      .open(CreateGroupDialog, { width: '32rem', maxWidth: '94vw' })
      .afterClosed()
      .subscribe((created) => {
        if (created) {
          this.notify('Grupo creado.');
          void this.loadGroups();
        }
      });
  }

  /** retry reloads the current group query. */
  protected retry(): void {
    void this.loadGroups();
  }

  /** dismissActionFailure closes the current action error message. */
  protected dismissActionFailure(): void {
    this.actionFailure.set(null);
  }

  /** openPermissions takes the administrator to the permissions of a role. */
  protected openPermissions(row: GroupRow): void {
    if (this.isMutationInProgress()) {
      return;
    }
    void this.router.navigate(['/permissions', row.id]);
  }

  /** requestDeleteGroup asks for confirmation before logical deletion. */
  protected async requestDeleteGroup(row: GroupRow): Promise<void> {
    if (this.isMutationInProgress()) {
      return;
    }

    const group = this.groups().find((item) => item.id === row.id);
    if (!group) {
      return;
    }

    const data: DeletableGroup = { name: group.name };
    this.dialog
      .open(DeleteGroupDialog, { data, width: '34rem', maxWidth: '94vw' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          void this.deleteGroup(group);
        }
      });
  }

  /** onReorder persists the order that the administrator chose. */
  protected async onReorder(ids: readonly string[]): Promise<void> {
    const current = this.groups();
    const next = ids
      .map((id) => current.find((group) => group.id === id))
      .filter((group): group is Group => group !== undefined);
    if (next.length !== current.length) {
      return;
    }
    await this.persistOrder(next);
  }

  private async loadGroups(): Promise<void> {
    if (this.isMutationInProgress()) {
      this.reloadAfterMutation = true;
      return;
    }
    const search = this.searchTerm().trim();
    if (this.searchValidationMessage()) {
      this.groups.set([]);
      this.listComplete.set(false);
      this.loadFailure.set(null);
      this.loading.set(false);
      return;
    }
    const request = ++this.listRequest;
    this.loading.set(true);
    this.listComplete.set(false);
    this.loadFailure.set(null);
    try {
      const result = await this.listGroups.execute({
        ...(search ? { search } : {}),
        limit: GROUP_LIST_LIMIT,
        page: 1,
      });
      if (request !== this.listRequest) {
        return;
      }
      const sorted = [...result.items].sort((left, right) => left.priority - right.priority);
      this.groups.set(sorted);
      this.listComplete.set(
        !search &&
          result.page === 1 &&
          result.totalPages <= 1 &&
          result.items.length === result.total &&
          result.total <= MAX_ACTIVE_GROUPS,
      );
    } catch (error) {
      if (request === this.listRequest) {
        this.loadFailure.set(describeGroupFailure(error, 'No se pudieron cargar los grupos'));
      }
    } finally {
      if (request === this.listRequest) {
        this.loading.set(false);
      }
    }
  }

  private async persistOrder(next: readonly Group[]): Promise<void> {
    if (!this.canReorder()) {
      return;
    }
    this.beginMutation();
    const previous = this.groups();
    const ordered = next.map((group, index) =>
      group.withPriority(GroupPriority.restore(index + 1)),
    );
    this.groups.set(ordered);
    this.reordering.set(true);
    this.actionFailure.set(null);
    let conflict = false;
    try {
      await this.reorderGroups.execute({ groupIds: ordered.map((group) => group.id) });
      this.notify('Orden de grupos actualizado.');
    } catch (error) {
      this.groups.set(previous);
      conflict = isGroupConflict(error);
      if (conflict) {
        this.reloadAfterMutation = true;
      } else {
        this.actionFailure.set(describeGroupFailure(error, 'No se pudo reordenar los grupos'));
      }
    } finally {
      this.reordering.set(false);
    }
    await this.refreshAfterMutation();
    if (conflict) {
      this.actionFailure.set({
        title: 'El orden cambió en otra sesión',
        message: this.loadFailure()
          ? 'No se pudo actualizar la lista. Vuelve a intentarlo antes de reordenar.'
          : 'Se actualizó la lista. Revisa la jerarquía y vuelve a intentarlo.',
      });
    }
  }

  private async deleteGroup(group: Group): Promise<void> {
    if (this.isMutationInProgress()) {
      return;
    }
    this.beginMutation();
    this.deletingId.set(group.id);
    this.actionFailure.set(null);
    let deleted = false;
    try {
      await this.deleteGroupCommand.execute({ uuid: group.id });
      deleted = true;
      this.reloadAfterMutation = true;
    } catch (error) {
      if (isGroupConflict(error)) {
        this.reloadAfterMutation = true;
      }
      this.actionFailure.set(describeGroupFailure(error, 'No se pudo eliminar el grupo'));
    } finally {
      this.deletingId.set(null);
    }
    await this.refreshAfterMutation();
    if (deleted) {
      this.groupsHeading()?.nativeElement.focus();
      this.notify('Grupo eliminado.');
    }
  }

  private beginMutation(): void {
    this.clearSearchTimer();
    if (this.loading()) {
      this.reloadAfterMutation = true;
    }
    this.listRequest += 1;
    this.loading.set(false);
  }

  private async refreshAfterMutation(): Promise<void> {
    if (this.isMutationInProgress() || !this.reloadAfterMutation) {
      return;
    }
    this.reloadAfterMutation = false;
    await this.loadGroups();
  }

  private isMutationInProgress(): boolean {
    return this.reordering() || this.deletingId() !== null;
  }

  private clearSearchTimer(): void {
    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
