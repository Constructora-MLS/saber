// Package certificateverificationpage shows the public trace of a
// certificate.
//
// The page is the answer of the platform to the QR of a certificate: a
// person that scans the code of a document reads the certificate that the
// company issued.
// package certificateverificationpage

import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VerifyCertificateQueryService } from '../../../application/query-services/verify-certificate-query-service';
import { CertificateVerification } from '../../../domain/model/value-objects/certificate-verification';
import { formatCertificateDate } from '../../components/certificate-date.format';

/**
 * CertificateVerificationPage shows whether a certificate is genuine.
 *
 * The page reads the code from the address of the browser, so the address
 * that the QR of the document carries is the address of the page. It never
 * talks to the API directly.
 */
@Component({
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  selector: 'app-certificate-verification-page',
  styleUrl: './certificate-verification-page.scss',
  templateUrl: './certificate-verification-page.html',
})
export class CertificateVerificationPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly verify = inject(VerifyCertificateQueryService);

  /** The trace of the certificate, when the platform answered it. */
  protected readonly verification = signal<CertificateVerification | null>(null);
  /** Whether the page is waiting for the platform. */
  protected readonly loading = signal(true);
  /** The failure that prevented the consultation. */
  protected readonly failure = signal<string | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  /**
   * load reads the trace of the certificate of the address.
   */
  private async load(): Promise<void> {
    this.loading.set(true);
    this.failure.set(null);

    const code = this.route.snapshot.paramMap.get('code') ?? '';
    try {
      this.verification.set(await this.verify.execute(code));
    } catch {
      this.failure.set(
        'No se pudo consultar el certificado. Revisa el código e inténtalo de nuevo.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * formatDate writes a date of the platform in the language of the
   * interfaces.
   */
  protected formatDate(date: string): string {
    return formatCertificateDate(date);
  }
}
