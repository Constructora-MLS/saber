// Package certificatehistory shows the certificates that were issued.
// package certificatehistory

import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TableState } from '../../../../shared/interfaces/components/table-state/table-state';
import { CertificateStatus } from '../../../domain/model/value-objects/certificate-status';
import { certificateStatusLabel } from '../../../domain/model/value-objects/certificate-status';
import { formatCertificateDate } from '../certificate-date.format';

/**
 * IssuedCertificateCard is the presentation of an issued certificate.
 *
 * The card carries the data that the certificate archived: the worker, the
 * unit of work and the moment of the issuance. The identifier of the
 * certificate is internal, so it never reaches the card.
 */
export interface IssuedCertificateCard {
  /** The identifier of the certificate. */
  readonly certificateId: string;
  /** The name of the worker. */
  readonly workerName: string;
  /** The identity document of the worker. */
  readonly dni: string;
  /** The unit of work the worker was assigned to. */
  readonly workUnit: string;
  /** The code of the unit of work. */
  readonly workUnitCode: string;
  /** The moment the certificate was issued, in the RFC 3339 format. */
  readonly issuedAt: string;
  /** The state of the certificate. */
  readonly status: CertificateStatus;
  /** The name of the service, when the catalog answered. */
  readonly serviceName: string | null;
}

/**
 * CertificateHistory shows the certificates that were issued.
 *
 * The component is presentational: it renders the history and it announces
 * the intention of the worker through its outputs. It never talks to the
 * API.
 */
@Component({
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule, TableState],
  selector: 'app-certificate-history',
  styleUrl: './certificate-history.scss',
  templateUrl: './certificate-history.html',
})
export class CertificateHistory {
  /** The caption of the history, read by the assistive technologies. */
  readonly caption = input.required<string>();
  /** The certificates that were issued. */
  readonly cards = input.required<readonly IssuedCertificateCard[]>();
  /** Whether the history is waiting for the certificates. */
  readonly loading = input(false);
  /** The headline of the failure that prevented the consultation. */
  readonly errorTitle = input<string | null>(null);
  /** The detail of the failure that prevented the consultation. */
  readonly errorMessage = input<string | null>(null);
  /** The headline shown when the history is empty. */
  readonly emptyTitle = input('Todavía no hay certificados emitidos');
  /** The supporting text shown when the history is empty. */
  readonly emptyMessage = input(
    'Emite el certificado de una asignación cesada para que aparezca aquí.',
  );
  /** The emblem shown when the history is empty. */
  readonly emptyIcon = input('history');

  /** The visualization of a certificate was requested. */
  readonly viewRequested = output<IssuedCertificateCard>();
  /** The download of a certificate was requested. */
  readonly downloadRequested = output<IssuedCertificateCard>();
  /** The annulment of a certificate was requested. */
  readonly annulRequested = output<IssuedCertificateCard>();
  /** The consultation of the history was requested again. */
  readonly retryRequested = output<void>();

  /**
   * formatDate writes a date of the platform in the language of the
   * interfaces.
   */
  protected formatDate(date: string): string {
    return formatCertificateDate(date);
  }

  /**
   * statusLabel returns the label of a state in the language of the
   * interfaces.
   */
  protected statusLabel(status: CertificateStatus): string {
    return certificateStatusLabel(status);
  }
}
