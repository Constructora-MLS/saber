import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

/** DeletableGroup is the group whose deletion was requested. */
export interface DeletableGroup {
  /** The name shown in the confirmation. */
  readonly name: string;
}

/** DeleteGroupDialog confirms an irreversible request before it reaches the page. */
@Component({
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  selector: 'app-delete-group-dialog',
  styleUrl: './delete-group-dialog.scss',
  templateUrl: './delete-group-dialog.html',
})
export class DeleteGroupDialog {
  private readonly dialogRef = inject<MatDialogRef<DeleteGroupDialog, boolean>>(MatDialogRef);

  /** The group that the person chose to delete. */
  protected readonly data = inject<DeletableGroup>(MAT_DIALOG_DATA);

  /** cancel closes the confirmation without deleting the group. */
  protected cancel(): void {
    this.dialogRef.close(false);
  }

  /** confirm returns the deletion intention to the page. */
  protected confirm(): void {
    this.dialogRef.close(true);
  }
}
