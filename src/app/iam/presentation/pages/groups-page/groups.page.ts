import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import {
  CreateGroupCommandService,
  DeleteGroupCommandService,
  ReorderGroupsCommandService,
  UpdateGroupCommandService,
} from '../../../application/command-services/group-command-services';
import { CreateGroupCommand, UpdateGroupCommand } from '../../../application/commands/group-commands';
import {
  GetGroupQueryService,
  ListGroupsQueryService,
} from '../../../application/query-services/group-query-services';
import { Group } from '../../../domain/model/aggregates/group';
import { GroupPriority } from '../../../domain/model/value-objects/group-priority';
import {
  DeletableGroup,
  DeleteGroupDialog,
} from '../../components/delete-group-dialog/delete-group-dialog';
import { DiscardGroupChangesDialog } from '../../components/discard-group-changes-dialog/discard-group-changes-dialog';
import { GroupEditor } from '../../components/group-editor/group-editor';
import { TableState } from '../../../../shared/presentation/components/table-state/table-state';
import {
  describeGroupFailure,
  GroupFailureMessage,
  isGroupConflict,
} from '../group-failures';

/** The API page size covers the backend's complete active-group limit. */
const GROUP_LIST_LIMIT = 100;
/** Akame permits at most fifty active groups. */
const MAX_ACTIVE_GROUPS = 50;
/** The groups endpoint accepts search terms between two and 120 code points. */
const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_LENGTH = 120;

/** GroupsPage orchestrates the read and management of the group hierarchy. */
@Component({
  imports: [
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    FormsModule,
    GroupEditor,
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly listGroups = inject(ListGroupsQueryService);
  private readonly createGroupCommand = inject(CreateGroupCommandService);
  private readonly getGroup = inject(GetGroupQueryService);
  private readonly updateGroup = inject(UpdateGroupCommandService);
  private readonly deleteGroupCommand = inject(DeleteGroupCommandService);
  private readonly reorderGroups = inject(ReorderGroupsCommandService);

  private listRequest = 0;
  private detailRequest = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private reloadAfterMutation = false;
  private editorTrigger: HTMLButtonElement | null = null;
  private readonly groupsHeading = viewChild<ElementRef<HTMLElement>>('groupsHeading');

  protected readonly searchTerm = signal('');
  protected readonly groups = signal<readonly Group[]>([]);
  protected readonly listComplete = signal(false);
  protected readonly loading = signal(true);
  protected readonly loadFailure = signal<GroupFailureMessage | null>(null);
  protected readonly actionFailure = signal<GroupFailureMessage | null>(null);
  protected readonly reordering = signal(false);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly creatingGroup = signal(false);

  protected readonly selectedGroupId = signal<string | null>(null);
  protected readonly selectedGroup = signal<Group | null>(null);
  protected readonly selectedGroupLoading = signal(false);
  protected readonly selectedGroupFailure = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveFailure = signal<string | null>(null);
  protected readonly editorPendingChanges = signal(false);

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
  /** Whether a reorder request can include the entire unfiltered hierarchy. */
  protected readonly canReorder = computed(
    () =>
      !this.loading() &&
      !this.reordering() &&
      !this.saving() &&
      this.deletingId() === null &&
      this.listComplete() &&
      !this.filtered() &&
      this.groups().length > 1,
  );
  /** Whether the create or edit sidebar is open. */
  protected readonly editorOpen = computed(
    () => this.creatingGroup() || this.selectedGroupId() !== null,
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

  /** openCreateGroup opens the shared group form in registration mode. */
  protected async openCreateGroup(event?: Event): Promise<void> {
    if (this.isMutationInProgress()) {
      return;
    }
    if (this.editorPendingChanges() && !(await this.confirmDiscardChanges())) {
      return;
    }

    const trigger = event?.currentTarget as HTMLButtonElement | null;
    if (trigger) {
      this.editorTrigger = trigger;
    }
    this.detailRequest += 1;
    this.selectedGroupId.set(null);
    this.selectedGroup.set(null);
    this.selectedGroupLoading.set(false);
    this.selectedGroupFailure.set(null);
    this.editorPendingChanges.set(false);
    this.saveFailure.set(null);
    this.creatingGroup.set(true);
  }

  /** retry reloads the current group query. */
  protected retry(): void {
    void this.loadGroups();
  }

  /** dismissActionFailure closes the current action error message. */
  protected dismissActionFailure(): void {
    this.actionFailure.set(null);
  }

  /** openEditor fetches the current representation before editing a group. */
  protected async openEditor(group: Group, event?: Event): Promise<void> {
    const trigger = event?.currentTarget as HTMLButtonElement | null;
    if (this.saving() || this.selectedGroupId() === group.id) {
      return;
    }
    if (this.editorPendingChanges() && !(await this.confirmDiscardChanges())) {
      return;
    }
    if (trigger) {
      this.editorTrigger = trigger;
    }
    await this.loadGroupDetails(group.id);
  }

  /** requestCloseEditor protects a group edit from accidental loss. */
  protected async requestCloseEditor(): Promise<void> {
    if (this.saving()) {
      return;
    }
    if (this.editorPendingChanges() && !(await this.confirmDiscardChanges())) {
      return;
    }
    this.closeEditor();
  }

  /** retryGroupDetails repeats the read of the group currently being edited. */
  protected retryGroupDetails(): void {
    const id = this.selectedGroupId();
    if (id !== null) {
      void this.loadGroupDetails(id);
    }
  }

  /** onPendingChangesChanged tracks the editor's net unsaved changes. */
  protected onPendingChangesChanged(pending: boolean): void {
    this.editorPendingChanges.set(pending);
  }

  /** createGroup registers the form intention and refreshes the current API result. */
  protected async createGroup(command: CreateGroupCommand): Promise<void> {
    if (!this.creatingGroup() || this.isMutationInProgress()) {
      return;
    }
    this.beginMutation();
    this.saving.set(true);
    this.saveFailure.set(null);
    try {
      await this.createGroupCommand.execute(command);
      this.editorPendingChanges.set(false);
      this.reloadAfterMutation = true;
      this.closeEditor();
      this.notify('Grupo creado.');
    } catch (error) {
      this.saveFailure.set(describeGroupFailure(error, 'No se pudo crear el grupo').message);
      if (isGroupConflict(error)) {
        this.reloadAfterMutation = true;
      }
    } finally {
      this.saving.set(false);
    }
    await this.refreshAfterMutation();
  }

  /** saveGroup sends the partial edit emitted by the editor. */
  protected async saveGroup(command: UpdateGroupCommand): Promise<void> {
    if (this.isMutationInProgress()) {
      return;
    }
    this.beginMutation();
    this.saving.set(true);
    this.saveFailure.set(null);
    try {
      const updated = await this.updateGroup.execute(command);
      this.groups.update((groups) =>
        groups
          .map((group) => (group.id === updated.id ? updated : group))
          .sort((left, right) => left.priority - right.priority),
      );
      this.selectedGroup.set(updated);
      this.editorPendingChanges.set(false);
      this.reloadAfterMutation = true;
      this.notify('Grupo actualizado.');
    } catch (error) {
      this.saveFailure.set(describeGroupFailure(error, 'No se pudo guardar el grupo').message);
      if (isGroupConflict(error)) {
        this.reloadAfterMutation = true;
      }
    } finally {
      this.saving.set(false);
    }
    await this.refreshAfterMutation();
  }

  /** requestDeleteGroup asks for confirmation before logical deletion. */
  protected async requestDeleteGroup(group: Group): Promise<void> {
    if (this.isMutationInProgress()) {
      return;
    }
    if (
      this.selectedGroupId() === group.id &&
      this.editorPendingChanges() &&
      !(await this.confirmDiscardChanges())
    ) {
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

  /** moveGroup provides a keyboard-accessible alternative to dragging. */
  protected async moveGroup(uuid: string, direction: -1 | 1): Promise<void> {
    if (!this.canReorder()) {
      return;
    }
    const current = [...this.groups()];
    const from = current.findIndex((group) => group.id === uuid);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= current.length) {
      return;
    }
    moveItemInArray(current, from, to);
    await this.persistOrder(current);
  }

  /** onDrop persists the drag order after checking its completeness. */
  protected onDrop(event: CdkDragDrop<readonly Group[]>): void {
    if (!this.canReorder() || event.previousIndex === event.currentIndex) {
      return;
    }
    const next = [...this.groups()];
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    void this.persistOrder(next);
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

  private async loadGroupDetails(uuid: string): Promise<void> {
    const request = ++this.detailRequest;
    this.creatingGroup.set(false);
    this.selectedGroupId.set(uuid);
    this.selectedGroup.set(null);
    this.selectedGroupLoading.set(true);
    this.selectedGroupFailure.set(null);
    this.saveFailure.set(null);
    this.editorPendingChanges.set(false);
    try {
      const group = await this.getGroup.execute({ uuid });
      if (request === this.detailRequest) {
        this.selectedGroup.set(group);
      }
    } catch (error) {
      if (request === this.detailRequest) {
        this.selectedGroupFailure.set(
          describeGroupFailure(error, 'No se pudieron cargar los detalles del grupo').message,
        );
      }
    } finally {
      if (request === this.detailRequest) {
        this.selectedGroupLoading.set(false);
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
      if (this.selectedGroupId() === group.id) {
        this.closeEditor(false);
      }
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

  private async confirmDiscardChanges(): Promise<boolean> {
    return (
      (await firstValueFrom(
        this.dialog
          .open(DiscardGroupChangesDialog, { width: '30rem', maxWidth: '94vw' })
          .afterClosed(),
      )) === true
    );
  }

  private closeEditor(restoreFocus = true): void {
    const trigger = this.editorTrigger;
    this.editorTrigger = null;
    this.detailRequest += 1;
    this.creatingGroup.set(false);
    this.selectedGroupId.set(null);
    this.selectedGroup.set(null);
    this.selectedGroupLoading.set(false);
    this.selectedGroupFailure.set(null);
    this.saveFailure.set(null);
    this.editorPendingChanges.set(false);
    if (restoreFocus) {
      queueMicrotask(() => {
        if (trigger?.isConnected) {
          trigger.focus();
        } else {
          this.groupsHeading()?.nativeElement.focus();
        }
      });
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
    return this.reordering() || this.saving() || this.deletingId() !== null;
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
