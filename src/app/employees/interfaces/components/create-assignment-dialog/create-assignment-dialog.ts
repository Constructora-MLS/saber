// Package createassignmentdialog registers an assignment of a worker.
// package createassignmentdialog

import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AssignmentDialogWorker } from '../assignment-options';
import { todayAsAssignmentDate } from '../assignment-period/assignment-period.format';
import { CreateAssignmentCommand } from '../../../application/commands/assignment-commands';
import {
  PositionReference,
  WorkUnitReference,
} from '../../../domain/services/catalog-reference-resolver';

/**
 * CreateAssignmentDialogData is the context of the registration.
 *
 * The dialog never reads the catalogs by itself: the page gives it the
 * units of work and the positions that the worker can pick, and the worker
 * that the assignment belongs to.
 */
export interface CreateAssignmentDialogData {
  /** The worker the assignment belongs to. */
  readonly worker: AssignmentDialogWorker;
  /** The units of work that the assignment can point at. */
  readonly workUnits: readonly WorkUnitReference[];
  /** The positions that the assignment can point at. */
  readonly positions: readonly PositionReference[];
}

/**
 * CreateAssignmentDialog registers an assignment of a worker.
 *
 * The dialog only asks for what the context needs to register an
 * assignment: the unit of work, the position and the date the labour
 * period starts.
 */
@Component({
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  selector: 'app-create-assignment-dialog',
  styleUrl: './create-assignment-dialog.scss',
  templateUrl: './create-assignment-dialog.html',
})
export class CreateAssignmentDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<CreateAssignmentDialog, CreateAssignmentCommand | undefined>>(MatDialogRef);

  /** The context of the registration. */
  protected readonly data = inject<CreateAssignmentDialogData>(MAT_DIALOG_DATA);

  /** The last day that the platform accepts as the start of a period. */
  protected readonly today = todayAsAssignmentDate();

  protected readonly form = this.formBuilder.nonNullable.group({
    workUnitId: ['', [Validators.required]],
    positionId: ['', [Validators.required]],
    startDate: [this.today, [Validators.required]],
  });

  /**
   * cancel closes the dialog without registering the assignment.
   */
  protected cancel(): void {
    this.dialogRef.close();
  }

  /**
   * submit answers with the assignment that the worker asked to register.
   */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    this.dialogRef.close({
      employeeId: '',
      workUnitId: raw.workUnitId,
      positionId: raw.positionId,
      startDate: raw.startDate,
    });
  }
}
