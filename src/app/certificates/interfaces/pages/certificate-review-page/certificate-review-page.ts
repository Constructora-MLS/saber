// Package certificatereviewpage shows the certificate of an assignment
// before it is issued.
//
// The page is the frontend controller of the bounded context: it reads the
// draft of the certificate and the preview of the document through the use
// cases and it asks for the issuance. It never talks to the API directly.
// package certificatereviewpage

import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import {
  GetCertificateDraftQueryService,
  GetCertificatePreviewQueryService,
} from '../../../application/query-services/certificate-query-services';
import { IssueCertificateCommandService } from '../../../application/command-services/certificate-command-services';
import { CertificateDraft } from '../../../application/queries/certificate-queries';
import { Certificate } from '../../../domain/model/aggregates/certificate';
import { CertificateApiError } from '../../../infrastructure/http/certificate-api.error';
import { CertificateViewerDialog } from '../../components/certificate-viewer-dialog/certificate-viewer-dialog';
import { formatCertificateDate } from '../../components/certificate-date.format';
import { TableState } from '../../../../shared/interfaces/components/table-state/table-state';

/**
 * CertificateReviewFailure is the failure of the consultation of the
 * certificate.
 *
 * The headline names what happened and the detail tells the worker what to
 * do about it, so the interface never shows a bare technical message.
 */
interface CertificateReviewFailure {
  readonly title: string;
  readonly message: string;
}

/**
 * CertificateReviewPage shows the certificate of an assignment and issues
 * it.
 *
 * The page shows the data of the worker and the assignment beside the
 * preview of the document, so the worker checks the certificate before the
 * platform archives it. The preview is the PDF that the platform renders,
 * so it is exactly the document that the issuance keeps.
 */
@Component({
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, MatSnackBarModule, TableState],
  selector: 'app-certificate-review-page',
  styleUrl: './certificate-review-page.scss',
  templateUrl: './certificate-review-page.html',
})
export class CertificateReviewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly getDraft = inject(GetCertificateDraftQueryService);
  private readonly getPreview = inject(GetCertificatePreviewQueryService);
  private readonly issueCertificate = inject(IssueCertificateCommandService);

  /** The identifier of the assignment that the address of the browser carries. */
  private assignmentId = '';
  /** The worker of the assignment, when the address of the browser carries it. */
  private workerId: string | null = null;

  /** The certificate that is about to be issued. */
  protected readonly draft = signal<CertificateDraft | null>(null);
  /** The certificate that was issued, when it was already issued. */
  protected readonly issued = signal<Certificate | null>(null);

  /** The preview of the document, as the browser shows it. */
  protected readonly previewUrl = signal<SafeResourceUrl | null>(null);

  /** Whether the page is waiting for the answer of the platform. */
  protected readonly loading = signal(false);
  /** Whether the platform is rendering the certificate. */
  protected readonly issuing = signal(false);
  /** The failure that prevented the consultation. */
  protected readonly loadFailure = signal<CertificateReviewFailure | null>(null);

  /**
   * Whether the assignment cannot receive a certificate.
   *
   * The assignment is not in the queue when its labour period is still
   * open, so the page says so instead of showing an empty certificate.
   */
  protected readonly notEligible = computed(
    () => !this.loading() && this.loadFailure() === null && this.draft() === null,
  );

  /**
   * The certificate that the page shows.
   *
   * The certificate that was issued is the one that the page shows, so the
   * worker sees the certificate that the platform archived.
   */
  protected readonly certificate = computed<Certificate | null>(
    () => this.issued() ?? this.draft()?.certificates.find((item) => item.isIssued) ?? null,
  );

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('assignmentId') ?? ''),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((assignmentId) => {
        this.assignmentId = assignmentId;
        this.workerId = this.route.snapshot.queryParamMap.get('employeeId');
        void this.reload();
      });
  }

  /**
   * goBack returns to the page that opened the certificate.
   *
   * The worker of the assignment is known when the certificate was opened
   * from the record of the worker, so the page returns to it.
   */
  protected goBack(): void {
    if (this.workerId) {
      void this.router.navigate(['/employees', this.workerId, 'assignments']);
      return;
    }

    void this.router.navigate(['/certificates']);
  }

  /**
   * retry consults the certificate again.
   */
  protected retry(): void {
    void this.reload();
  }

  /**
   * openCertificate shows the document of the issued certificate.
   */
  protected openCertificate(certificate: Certificate): void {
    this.dialog.open(CertificateViewerDialog, {
      data: {
        certificateId: certificate.id.value,
        workerName: certificate.snapshot.fullName,
      },
      width: '52rem',
      maxWidth: '96vw',
    });
  }

  /**
   * issue asks the platform for the certificate of the assignment.
   *
   * The platform renders the PDF and archives it, so the page shows the
   * certificate that was issued without asking the worker to reload it.
   */
  protected async issue(): Promise<void> {
    this.issuing.set(true);

    try {
      const certificate = await this.issueCertificate.execute({
        assignmentId: this.assignmentId,
      });
      this.issued.set(certificate);
      this.notify('Certificado emitido.');
    } catch (error) {
      this.notify(this.describe(error).message);
    } finally {
      this.issuing.set(false);
    }
  }

  /**
   * formatDate writes a date of the platform in the language of the
   * interfaces.
   */
  protected formatDate(date: string): string {
    return formatCertificateDate(date);
  }

  /**
   * reload reads the certificate that is about to be issued and the preview
   * of the document.
   */
  private async reload(): Promise<void> {
    this.loading.set(true);
    this.loadFailure.set(null);
    this.issued.set(null);

    try {
      const draft = await this.getDraft.execute(this.assignmentId);

      if (!draft) {
        this.draft.set(null);
        this.previewUrl.set(null);
        return;
      }

      this.draft.set(draft);
      await this.loadPreview();
    } catch (error) {
      this.draft.set(null);
      this.previewUrl.set(null);
      this.loadFailure.set(this.describe(error));
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * loadPreview reads the document that the issuance would archive.
   */
  private async loadPreview(): Promise<void> {
    const file = await this.getPreview.execute(this.assignmentId);
    // The document is a PDF that the platform itself rendered, so the
    // browser may show it as a resource of the page.
    this.previewUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(file)));
  }

  /**
   * describe turns a failure into the state the interfaces show.
   */
  private describe(error: unknown): CertificateReviewFailure {
    if (error instanceof CertificateApiError) {
      if (error.status === 0) {
        return {
          title: 'No se pudo conectar con el servidor',
          message:
            'El servicio de certificados no respondió. Verifica que el servidor esté activo e inténtalo nuevamente.',
        };
      }

      if (error.status === 409) {
        return {
          title: 'La asignación no puede recibir el certificado',
          message:
            'El periodo de trabajo de la asignación todavía está abierto o el certificado ya fue emitido.',
        };
      }

      if (error.status >= 500) {
        return {
          title: 'El servicio de certificados no está disponible',
          message: 'El servidor falló al responder. Inténtalo nuevamente en unos instantes.',
        };
      }

      if (error.code === 'unexpected_error') {
        return {
          title: 'No se pudo completar la operación',
          message:
            'La plataforma no devolvió una respuesta válida. Inténtalo nuevamente en unos instantes.',
        };
      }

      return {
        title: 'No se pudo completar la operación',
        message: error.detail,
      };
    }

    return {
      title: 'No se pudo completar la operación',
      message: 'Ocurrió un problema inesperado al emitir el certificado. Inténtalo nuevamente.',
    };
  }

  /**
   * notify shows the outcome of an action.
   */
  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
