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
import {
  GetCertificateFileQueryService,
  GetCertificatePreviewQueryService,
} from '../../../application/query-services/certificate-query-services';

/**
 * CertificateViewerData identifies the PDF that the dialog shows.
 */
export type CertificateViewerData =
  | {
      /** The archived certificate that is shown. */
      readonly kind: 'issued';
      readonly certificateId: string;
      readonly workerName: string;
    }
  | {
      /** The assignment whose certificate is previewed before issuance. */
      readonly kind: 'preview';
      readonly assignmentId: string;
      readonly workerName: string;
    };

/**
 * CertificateViewerDialog shows either an archived certificate or the PDF
 * preview of an eligible assignment.
 *
 * The component asks for the document through the matching application
 * query service and never talks to the API directly.
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
  private readonly getPreview = inject(GetCertificatePreviewQueryService);
  private readonly sanitizer = inject(DomSanitizer);

  /** Whether the document is an archived certificate that can be downloaded. */
  protected readonly canDownload = this.data.kind === 'issued';

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
      const file =
        this.data.kind === 'preview'
          ? await this.getPreview.execute(this.data.assignmentId)
          : await this.getFile.execute(this.data.certificateId);
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
