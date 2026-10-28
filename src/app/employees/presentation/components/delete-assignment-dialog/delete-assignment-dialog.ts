// Package deleteassignmentdialog logically deletes an assignment.
// package deleteassignmentdialog

import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

/**
 * DeletableAssignment is the assignment that a worker of the application
 * asks to delete.
 */
export interface DeletableAssignment {
  /** The identifier of the assignment. */
  readonly id: string;
  /** The name of the unit of work of the assignment. */
  readonly workUnitName: string;
  /** The code of the unit of work of the assignment. */
  readonly workUnitCode: string | null;
  /** The name of the position of the assignment. */
  readonly positionName: string;
}

/**
 * DeleteAssignmentDialog logically deletes an assignment.
 *
 * The deletion is permanent for the worker of the application: the record
 * leaves the listing of the assignments and it is not shown again.
 */
@Component({
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  selector: 'app-delete-assignment-dialog',
  styleUrl: './delete-assignment-dialog.scss',
  templateUrl: './delete-assignment-dialog.html',
})
export class DeleteAssignmentDialog {
  private readonly dialogRef = inject<MatDialogRef<DeleteAssignmentDialog, boolean>>(MatDialogRef);

  /** The assignment that is being deleted. */
  protected readonly data = inject<DeletableAssignment>(MAT_DIALOG_DATA);

  /**
   * cancel closes the dialog without deleting the assignment.
   */
  protected cancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * confirm deletes the assignment.
   */
  protected confirm(): void {
    this.dialogRef.close(true);
  }
}
