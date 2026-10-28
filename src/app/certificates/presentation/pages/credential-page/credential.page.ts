import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  GetPublicCertificateFileQueryService,
  VerifyCertificateQueryService,
} from '../../../application/query-services/verify-certificate-query-service';
import { CertificateVerification } from '../../../domain/model/value-objects/certificate-verification';
import { CertificateApiError } from '../../../infrastructure/errors/certificate-api.error';
import { CredentialHeader } from '../../components/credential-header/credential-header';
import { formatCertificateDate } from '../../components/certificate-date.format';

/** Public credential outside the HR shell. All reads use application services. */
@Component({
  imports: [
    CredentialHeader,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  selector: 'app-credential-page',
  styleUrl: './credential.page.scss',
  templateUrl: './credential.page.html',
})
export class CredentialPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly verify = inject(VerifyCertificateQueryService);
  private readonly getFile = inject(GetPublicCertificateFileQueryService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly request = new AbortController();
  private previewUrl: string | null = null;

  protected readonly verification = signal<CertificateVerification | null>(null);
  protected readonly loading = signal(true);
  protected readonly failure = signal<string | null>(null);
  protected readonly documentUrl = signal<SafeResourceUrl | null>(null);
  protected readonly fileFailure = signal<string | null>(null);
  protected readonly downloading = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    this.request.abort();
    this.clearPreview();
  }

  private clearPreview(): void {
    this.documentUrl.set(null);
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
  }

  private async load(): Promise<void> {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    try {
      const certificate = await this.verify.execute(code);
      if (this.request.signal.aborted) return;
      this.verification.set(certificate);
      if (!certificate) return;
      try {
        const file = await this.getFile.execute(certificate.code, this.request.signal);
        if (this.request.signal.aborted) return;
        this.previewUrl = URL.createObjectURL(file);
        this.documentUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl));
      } catch (error) {
        this.handleFileFailure(error);
      }
    } catch {
      if (!this.request.signal.aborted) {
        this.failure.set(
          'No se pudo consultar el certificado. Inténtalo de nuevo.',
        );
      }
    } finally {
      if (!this.request.signal.aborted) this.loading.set(false);
    }
  }

  /** Re-fetch rather than downloading a stale preview after an annulment. */
  protected async download(): Promise<void> {
    const certificate = this.verification();
    if (!certificate || this.downloading()) return;
    this.downloading.set(true);
    this.fileFailure.set(null);
    try {
      const file = await this.getFile.execute(certificate.code, this.request.signal);
      if (this.request.signal.aborted) return;
      const url = URL.createObjectURL(file);
      try {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${certificate.code}.pdf`;
        anchor.click();
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      this.handleFileFailure(error);
    } finally {
      this.downloading.set(false);
    }
  }

  private handleFileFailure(error: unknown): void {
    if (this.request.signal.aborted) return;
    if (error instanceof CertificateApiError && error.status === 404) {
      // Annulment may happen between the verification and the file request.
      this.clearPreview();
      this.verification.set(null);
    } else {
      this.fileFailure.set('No se pudo abrir el PDF. Puedes intentar descargarlo de nuevo.');
    }
  }

  /** Share only the public link, never the retained file or an internal UUID. */
  protected async share(): Promise<void> {
    const certificate = this.verification();
    if (!certificate) return;
    const url = new URL(`/verify/${encodeURIComponent(certificate.code)}`, window.location.origin)
      .href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Certificado ${certificate.code}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        this.notify('Enlace copiado.');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      this.notify('No se pudo compartir el enlace. Puedes copiar la dirección del navegador.');
    }
  }

  private notify(message: string): void {
    if (!this.request.signal.aborted) {
      this.snackBar.open(message, 'Cerrar', { duration: 4000 });
    }
  }

  protected formatDate(date: string): string {
    return formatCertificateDate(date);
  }
}
