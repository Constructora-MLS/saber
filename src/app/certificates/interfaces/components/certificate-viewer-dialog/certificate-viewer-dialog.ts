// Package certificateverdialog shows the document of an issued certificate.
//
// The dialog shows the very PDF that the platform archived, so the worker
// sees the certificate that the platform keeps.
// package certificateverdialog

import { Component, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GetCertificateFileQueryService } from '../../../application/query-services/certificate-query-services';

/**
 * CertificateViewerData is the certificate that the dialog shows.
 */
export interface CertificateViewerData {
  /** The certificate that is shown. */
  readonly certificateId: string;
  /** The name of the worker, shown as the title of the dialog. */
  readonly workerName: string;
}

/**
 * CertificateViewerDialog shows the PDF of an issued certificate.
 *
 * The component is presentational: it renders the document and it never
 * talks to the API by itself, it asks for the file through the use case.
 */
@Component({
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule],
  selector: 'app-certificate-viewer-dialog',
  styleUrl: './certificate-viewer-dialog.scss',
  templateUrl: './certificate-viewer-dialog.html',
})
export class CertificateViewerDialog {
  /** The certificate that the dialog shows. */
  protected readonly data = inject<CertificateViewerData>(MAT_DIALOG_DATA);

  private readonly dialogRef = inject<MatDialogRef<CertificateViewerDialog, void>>(MatDialogRef);
  private readonly getFile = inject(GetCertificateFileQueryService);
  private readonly sanitizer = inject(DomSanitizer);

  /** The document of the certificate, as the browser shows it. */
  protected readonly documentUrl = signal<SafeResourceUrl | null>(null);

  /** The address of the document, for the download. */
  private fileUrl: string | null = null;
  /** Whether the dialog is waiting for the document. */
  protected readonly loading = signal(true);
  /** The failure that prevented the consultation. */
  protected readonly failure = signal<string | null>(null);

  constructor() {
    void this.load();
  }

  /**
   * close closes the dialog.
   */
  protected close(): void {
    this.dialogRef.close();
  }

  /**
   * download hands the document of the certificate to the browser.
   */
  protected download(): void {
    const url = this.fileUrl;
    if (!url) {
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Certificado - ${this.data.workerName}.pdf`;
    anchor.click();
  }

  /**
   * load reads the document of the certificate.
   */
  private async load(): Promise<void> {
    this.loading.set(true);
    this.failure.set(null);

    try {
      const file = await this.getFile.execute(this.data.certificateId);
      this.fileUrl = URL.createObjectURL(file);
      // The document is a PDF that the platform itself archived, so the
      // browser may show it as a resource of the page.
      this.documentUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.fileUrl));
    } catch {
      this.failure.set('No se pudo abrir el certificado. Inténtalo nuevamente.');
    } finally {
      this.loading.set(false);
    }
  }
}
