import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-issue-certificate-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Emitir certificado</h2>
    <mat-dialog-content>
      <p>¿Emitir el certificado de {{ data.workerName }}? Se generará y archivará el PDF.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton type="button" [mat-dialog-close]="false">Cancelar</button>
      <button matButton="filled" type="button" [mat-dialog-close]="true">
        <mat-icon aria-hidden="true">file_export</mat-icon>
        Emitir
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    p {
      margin: 0;
      max-width: 46ch;
      color: var(--app-text-muted);
      font-size: 0.9rem;
    }
  `,
})
export class IssueCertificateDialog {
  protected readonly data = inject<{ readonly workerName: string }>(MAT_DIALOG_DATA);
}
