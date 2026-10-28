// Package restoretemplatedialog asks for the confirmation of the restoration
// of the content of a certificate.
//
// The restoration replaces the text that the worker wrote with the default
// one of the platform, so the dialog asks before the change.
// package restoretemplatedialog

import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

/**
 * RestoreTemplateDialogData is the service whose content is restored.
 */
export interface RestoreTemplateDialogData {
  /** The name of the service. */
  readonly serviceName: string;
}

/**
 * RestoreTemplateDialog confirms the restoration of the content.
 */
@Component({
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  selector: 'app-restore-template-dialog',
  templateUrl: './restore-template-dialog.html',
  styles: [
    `
      .description {
        margin: 0;
        max-width: 46ch;
        color: var(--app-text-muted);
        font-size: 0.9rem;
      }

      .actions {
        padding: 0.75rem 1.25rem 1.25rem;
      }
    `,
  ],
})
export class RestoreTemplateDialog {
  /** The service whose content is restored. */
  protected readonly data = inject<RestoreTemplateDialogData>(MAT_DIALOG_DATA);

  private readonly dialogRef = inject<MatDialogRef<RestoreTemplateDialog, boolean>>(MatDialogRef);

  /**
   * cancel closes the dialog without restoring the content.
   */
  protected cancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * confirm closes the dialog with the intention of restoring the content.
   */
  protected confirm(): void {
    this.dialogRef.close(true);
  }
}
