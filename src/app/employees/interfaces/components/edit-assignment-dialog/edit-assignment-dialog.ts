import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UpdateAssignmentCommand } from '../../../application/commands/assignment-commands';
import { todayAsAssignmentDate } from '../assignment-period/assignment-period.format';
import { AssignmentDialogWorker } from '../assignment-options';
import {
  PositionReference,
  WorkUnitReference,
} from '../../../domain/services/catalog-reference-resolver';

/** The assignment details that can be edited from its row. */
export interface EditableAssignment {
  readonly id: string;
  readonly workUnitId: string;
  readonly workUnitName: string;
  readonly workUnitCode: string | null;
  readonly workUnitService: string | null;
  readonly positionId: string;
  readonly positionName: string;
  readonly startDate: string;
  readonly endDate: string | null;
}

/** The context of the assignment edit dialog. */
export interface EditAssignmentDialogData {
  readonly worker: AssignmentDialogWorker;
  readonly assignment: EditableAssignment;
  readonly workUnits: readonly WorkUnitReference[];
  readonly positions: readonly PositionReference[];
}

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
  selector: 'app-edit-assignment-dialog',
  styleUrl: './edit-assignment-dialog.scss',
  templateUrl: './edit-assignment-dialog.html',
})
export class EditAssignmentDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef = inject<
    MatDialogRef<EditAssignmentDialog, UpdateAssignmentCommand | undefined>
  >(MatDialogRef);

  protected readonly data = inject<EditAssignmentDialogData>(MAT_DIALOG_DATA);
  protected readonly today = todayAsAssignmentDate();
  protected readonly maxStartDate =
    this.data.assignment.endDate && this.data.assignment.endDate < this.today
      ? this.data.assignment.endDate
      : this.today;

  protected readonly form = this.formBuilder.nonNullable.group({
    workUnitId: [this.data.assignment.workUnitId, [Validators.required]],
    positionId: [this.data.assignment.positionId, [Validators.required]],
    startDate: [this.data.assignment.startDate, [Validators.required]],
  });

  protected hasChanges(): boolean {
    const current = this.form.getRawValue();
    return (
      current.workUnitId !== this.data.assignment.workUnitId ||
      current.positionId !== this.data.assignment.positionId ||
      current.startDate !== this.data.assignment.startDate
    );
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected submit(): void {
    if (this.form.invalid || !this.hasChanges()) {
      this.form.markAllAsTouched();
      return;
    }

    const current = this.form.getRawValue();
    this.dialogRef.close({
      uuid: this.data.assignment.id,
      ...(current.workUnitId !== this.data.assignment.workUnitId
        ? { workUnitId: current.workUnitId }
        : {}),
      ...(current.positionId !== this.data.assignment.positionId
        ? { positionId: current.positionId }
        : {}),
      ...(current.startDate !== this.data.assignment.startDate
        ? { startDate: current.startDate }
        : {}),
    });
  }
}
