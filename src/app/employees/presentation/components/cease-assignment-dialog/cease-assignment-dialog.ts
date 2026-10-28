// Package ceaseassignmentdialog closes the labour period of an assignment.
// package ceaseassignmentdialog

import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AssignmentDialogWorker } from '../assignment-options';
import {
  formatAssignmentDate,
  todayAsAssignmentDate,
} from '../assignment-period/assignment-period.format';

/**
 * CeasableAssignment is the assignment whose period is being closed.
 */
export interface CeasableAssignment {
  /** The name of the unit of work of the assignment. */
  readonly workUnitName: string;
  /** The code of the unit of work of the assignment. */
  readonly workUnitCode: string | null;
  /** The name of the position of the assignment. */
  readonly positionName: string;
  /** The date the labour period starts, in the YYYY-MM-DD format. */
  readonly startDate: string;
}

/**
 * CeaseAssignmentDialogData is the context of the cessation.
 */
export interface CeaseAssignmentDialogData {
  /** The worker the assignment belongs to. */
  readonly worker: AssignmentDialogWorker;
  /** The assignment whose period is being closed. */
  readonly assignment: CeasableAssignment;
}

/**
 * CeaseAssignmentDialog closes the labour period of an assignment.
 *
 * The dialog asks only for the date of the cessation: the cessation is the
 * operation that closes an open period, and the platform derives the state
 * of the assignment from it.
 */
@Component({
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  selector: 'app-cease-assignment-dialog',
  styleUrl: './cease-assignment-dialog.scss',
  templateUrl: './cease-assignment-dialog.html',
})
export class CeaseAssignmentDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<CeaseAssignmentDialog, string | undefined>>(MatDialogRef);

  /** The context of the cessation. */
  protected readonly data = inject<CeaseAssignmentDialogData>(MAT_DIALOG_DATA);

  /** The last day that the platform accepts as the end of a period. */
  protected readonly today = todayAsAssignmentDate();

  /** The date the period of the assignment started, in the language of the
   * interfaces. */
  protected readonly startDateLabel = formatAssignmentDate(this.data.assignment.startDate);

  protected readonly form = this.formBuilder.nonNullable.group({
    date: [this.today, [Validators.required]],
  });

  /**
   * cancel closes the dialog without closing the period.
   */
  protected cancel(): void {
    this.dialogRef.close();
  }

  /**
   * submit answers with the date the labour period ends.
   */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.form.getRawValue().date);
  }
}
