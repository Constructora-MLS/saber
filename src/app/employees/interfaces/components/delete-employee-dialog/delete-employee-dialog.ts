import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { DeleteEmployeeCommandService } from '../../../application/command-services/employee-command-services';
import { EmployeeValidationError } from '../../../domain/model/errors/employee-errors';
import { EmployeeApiError } from '../../../infrastructure/http/employee-api.error';

/**
 * DeletableEmployee is the worker that a worker of the application asks to
 * delete.
 */
export interface DeletableEmployee {
  /** The identifier of the worker. */
  readonly id: string;
  /** The full name of the worker. */
  readonly name: string;
}

/**
 * DeleteEmployeeDialog logically deletes a worker of the platform.
 *
 * The deletion is permanent for the worker of the application: the record
 * leaves the listing and it is not shown again.
 */
@Component({
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  selector: 'app-delete-employee-dialog',
  styleUrl: './delete-employee-dialog.scss',
  templateUrl: './delete-employee-dialog.html',
})
export class DeleteEmployeeDialog {
  private readonly deleteEmployee = inject(DeleteEmployeeCommandService);
  private readonly dialogRef = inject<MatDialogRef<DeleteEmployeeDialog, boolean>>(MatDialogRef);

  /** The worker that is being deleted. */
  protected readonly data = inject<DeletableEmployee>(MAT_DIALOG_DATA);

  protected readonly deleting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * cancel closes the dialog without deleting the worker.
   */
  protected cancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * confirm deletes the worker.
   */
  protected async confirm(): Promise<void> {
    if (this.deleting()) {
      return;
    }

    this.deleting.set(true);
    this.errorMessage.set(null);

    try {
      await this.deleteEmployee.execute({ uuid: this.data.id });
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
    if (error instanceof EmployeeApiError) {
      if (error.code === 'not_found') {
        return 'El trabajador ya no está registrado.';
      }
      return error.detail;
    }
    if (error instanceof EmployeeValidationError) {
      return error.reason;
    }
    return 'No se pudo borrar el trabajador.';
  }
}
