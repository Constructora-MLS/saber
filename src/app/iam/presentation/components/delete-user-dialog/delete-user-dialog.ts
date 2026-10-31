import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { DisableUserCommandService } from '../../../application/command-services/user-command-services';
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
  private readonly disableUser = inject(DisableUserCommandService);
  private readonly dialogRef = inject<MatDialogRef<DeleteUserDialog, boolean>>(MatDialogRef);

  /** The account that is being deleted. */
  protected readonly data = inject<DeletableUser>(MAT_DIALOG_DATA);

  protected readonly deleting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  /** The administrator confirmed the consequence of the operation. */
  protected readonly confirmed = signal(false);

  /**
   * The initials of the account, shown in its avatar.
   */
  protected readonly initials = computed(() => {
    const parts = this.data.name
      .split(' ')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  });

  /**
   * The label of the state of the account.
   */
  protected readonly statusLabel = computed(() => userStatusLabel(this.data.status));

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
      await this.disableUser.execute({ id: this.data.id });
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
    return 'No se pudo eliminar la cuenta.';
  }
}
