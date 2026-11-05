import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

/** DiscardGroupChangesDialog confirms leaving the editor with unsaved changes. */
@Component({
  imports: [MatButtonModule, MatDialogModule],
  selector: 'app-discard-group-changes-dialog',
  templateUrl: './discard-group-changes-dialog.html',
})
export class DiscardGroupChangesDialog {
  private readonly dialogRef =
    inject<MatDialogRef<DiscardGroupChangesDialog, boolean>>(MatDialogRef);

  /** stay keeps the current group and its unsaved edits. */
  protected stay(): void {
    this.dialogRef.close(false);
  }

  /** discard confirms that the editor may be left. */
  protected discard(): void {
    this.dialogRef.close(true);
  }
}
