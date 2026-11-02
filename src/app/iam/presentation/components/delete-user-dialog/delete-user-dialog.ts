import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { DeleteUserCommandService } from '../../../application/command-services/user-command-services';
import { AuthValidationError } from '../../../domain/model/errors/auth-errors';
import { UserApiError } from '../../../infrastructure/errors/user-api.error';
import { userStatusLabel } from '../../../domain/model/value-objects/user-status';
import { describeUserFailure } from '../../pages/user-failures';

/**
 * DeletableUser is the account that an administrator asks to delete.
 */
export interface DeletableUser {
  /** The identifier of the account. */
  readonly id: string;
  /** The name of the account. */
  readonly name: string;
  /** The address of the account. */
  readonly email: string;
  /** The state of the account. */
  readonly status: 'active' | 'pending';
}

/**
 * DeleteUserDialog removes the access of an account of the platform.
 *
 * The account is logically deleted and its sessions are closed: it never
 * reaches the platform again, but its data is not erased.
 */
@Component({
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  selector: 'app-delete-user-dialog',
  styleUrl: './delete-user-dialog.scss',
  templateUrl: './delete-user-dialog.html',
})
export class DeleteUserDialog {
  private readonly deleteUser = inject(DeleteUserCommandService);
  private readonly dialogRef = inject<MatDialogRef<DeleteUserDialog, boolean>>(MatDialogRef);

  /** The account that is being deleted. */
  protected readonly data = inject<DeletableUser>(MAT_DIALOG_DATA);

  protected readonly deleting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  /** The administrator confirmed the consequence of the operation. */
  protected readonly confirmed = signal(false);

  /**
   * The label of the state of the account.
   */
  protected readonly statusLabel = computed(() => userStatusLabel(this.data.status));

  /**
   * A pending account has an invitation and no sessions: the dialog talks
   * about the invitation, and an active one talks about the sessions.
   */
  private readonly pending = computed(() => this.data.status === 'pending');

  /** The headline of the dialog. */
  protected readonly title = computed(() =>
    this.pending() ? 'Borrar invitación' : 'Borrar cuenta',
  );

  /** The supporting text of the dialog. */
  protected readonly description = computed(() =>
    this.pending()
      ? 'La persona no podrá aceptar la invitación.'
      : 'La persona dejará de poder iniciar sesión.',
  );

  /** The warning of the consequence of the operation. */
  protected readonly warning = computed(() =>
    this.pending()
      ? 'La invitación se elimina y la cuenta queda deshabilitada.'
      : 'Se cerrarán sus sesiones activas al confirmar.',
  );

  /** The confirmation that the administrator has to give. */
  protected readonly confirmation = computed(() =>
    this.pending()
      ? 'Confirmo borrar la invitación y deshabilitar la cuenta.'
      : 'Confirmo borrar esta cuenta y cerrar sus sesiones activas.',
  );

  /** The label of the action of the dialog. */
  protected readonly action = computed(() =>
    this.pending() ? 'Borrar invitación' : 'Borrar cuenta',
  );

  /**
   * cancel closes the dialog without deleting the account.
   */
  protected cancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * onConfirmationChanged keeps the confirmation of the consequence.
   */
  protected onConfirmationChanged(event: Event): void {
    this.confirmed.set((event.target as HTMLInputElement).checked);
  }

  /**
   * confirm deletes the account.
   */
  protected async confirm(): Promise<void> {
    if (this.deleting() || !this.confirmed()) {
      return;
    }

    this.deleting.set(true);
    this.errorMessage.set(null);

    try {
      await this.deleteUser.execute({ id: this.data.id });
      this.dialogRef.close(true);
    } catch (error) {
      this.errorMessage.set(this.describe(error));
    } finally {
      this.deleting.set(false);
    }
  }

  /**
   * describe turns a failure into the message the interfaces show.
   */
  private describe(error: unknown): string {
    if (error instanceof UserApiError) {
      return describeUserFailure(error).message;
    }
    if (error instanceof AuthValidationError) {
      return error.reason;
    }
    return 'No se pudo borrar la cuenta.';
  }
}
