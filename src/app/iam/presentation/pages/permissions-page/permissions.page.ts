import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { UpdateGroupCommandService } from '../../../application/command-services/group-command-services';
import { UpdateGroupCommand } from '../../../application/commands/group-commands';
import { GetGroupQueryService } from '../../../application/query-services/group-query-services';
import { Group } from '../../../domain/model/aggregates/group';
import { GroupPermissionsForm } from '../../components/group-permissions-form/group-permissions-form';
import { DiscardGroupChangesDialog } from '../../components/discard-group-changes-dialog/discard-group-changes-dialog';
import { describeGroupFailure } from '../group-failures';

/**
 * PermissionsPage configures the permissions of a role.
 *
 * The page is the place where the administrator grants to a role the
 * capabilities of the platform: it reads the role, it shows the
 * permissions and it writes the change.
 */
@Component({
  imports: [
    GroupPermissionsForm,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  selector: 'app-permissions-page',
  styleUrl: './permissions.page.scss',
  templateUrl: './permissions.page.html',
})
export class PermissionsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly getGroup = inject(GetGroupQueryService);
  private readonly updateGroup = inject(UpdateGroupCommandService);

  /** The role that the page is configuring. */
  protected readonly group = signal<Group | null>(null);
  /** Whether the role is being read. */
  protected readonly loading = signal(true);
  /** The message of the failure of the read. */
  protected readonly loadFailure = signal<string | null>(null);
  /** The message of the failure of the write. */
  protected readonly saveFailure = signal<string | null>(null);
  /** Whether the write is in progress. */
  protected readonly saving = signal(false);
  /** Whether the form has changes that were not saved. */
  protected readonly pendingChanges = signal(false);

  /** The identifier of the role that the route carries. */
  private currentGroupId: string | null = null;

  private request = 0;

  constructor() {
    // The route carries the role that the page configures: the page reads
    // it again when the administrator opens another role.
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const uuid = params.get('groupId');
      this.currentGroupId = uuid;
      if (uuid !== null) {
        void this.loadGroup(uuid);
      }
    });
  }

  /** retry reads the role again. */
  protected retry(): void {
    if (this.currentGroupId !== null) {
      void this.loadGroup(this.currentGroupId);
    }
  }

  /** save writes the changes of the form and returns to the roles. */
  protected async save(command: UpdateGroupCommand): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.saving.set(true);
    this.saveFailure.set(null);
    try {
      const updated = await this.updateGroup.execute(command);
      this.group.set(updated);
      this.pendingChanges.set(false);
      this.notify('Permisos actualizados.');
      await this.router.navigate(['/groups']);
    } catch (error) {
      this.saveFailure.set(describeGroupFailure(error, 'No se pudo guardar el rol').message);
    } finally {
      this.saving.set(false);
    }
  }

  /** cancel leaves the page, protecting the changes that were not saved. */
  protected async cancel(): Promise<void> {
    if (this.saving()) {
      return;
    }
    if (this.pendingChanges() && !(await this.confirmDiscardChanges())) {
      return;
    }
    await this.router.navigate(['/groups']);
  }

  /** onPendingChangesChanged tracks the changes of the form. */
  protected onPendingChangesChanged(pending: boolean): void {
    this.pendingChanges.set(pending);
  }

  private async loadGroup(uuid: string): Promise<void> {
    const request = ++this.request;
    this.loading.set(true);
    this.loadFailure.set(null);
    this.saveFailure.set(null);
    this.pendingChanges.set(false);
    try {
      const group = await this.getGroup.execute({ uuid });
      if (request === this.request) {
        this.group.set(group);
      }
    } catch (error) {
      if (request === this.request) {
        this.group.set(null);
        this.loadFailure.set(
          describeGroupFailure(error, 'No se pudieron cargar los permisos del rol').message,
        );
      }
    } finally {
      if (request === this.request) {
        this.loading.set(false);
      }
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

  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
