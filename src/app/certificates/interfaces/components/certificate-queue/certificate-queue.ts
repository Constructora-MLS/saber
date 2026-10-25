// Package certificatequeue shows the assignments that are waiting for a
// certificate.
// package certificatequeue

import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TableState } from '../../../../shared/interfaces/components/table-state/table-state';
import { formatCertificateDate } from '../certificate-date.format';

/**
 * PendingCertificateCard is the presentation of an assignment that is
 * waiting for a certificate.
 *
 * The card carries the data that the certificate will archive: the worker,
 * the unit of work and the period of the labour.
 */
export interface PendingCertificateCard {
  /** The assignment that may receive a certificate. */
  readonly assignmentId: string;
  /** The name of the worker. */
  readonly workerName: string;
  /** The identity document of the worker. */
  readonly dni: string;
  /** The position the worker performed. */
  readonly position: string;
  /** The unit of work the worker was assigned to. */
  readonly workUnit: string;
  /** The code of the unit of work. */
  readonly workUnitCode: string;
  /** The date the labour period starts, in the YYYY-MM-DD format. */
  readonly startDate: string;
  /** The date the labour period was closed, in the YYYY-MM-DD format. */
  readonly endDate: string;
  /** The name of the service, when the catalog answered. */
  readonly serviceName: string | null;
}

/**
 * CertificateQueue shows the assignments that are waiting for a certificate.
 *
 * The component is presentational: it renders the queue and it announces
 * the intention of the worker through its outputs. It never talks to the
 * API.
 */
@Component({
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, TableState],
  selector: 'app-certificate-queue',
  styleUrl: './certificate-queue.scss',
  templateUrl: './certificate-queue.html',
})
export class CertificateQueue {
  /** The caption of the queue, read by the assistive technologies. */
  readonly caption = input.required<string>();
  /** The assignments that are waiting for a certificate. */
  readonly cards = input.required<readonly PendingCertificateCard[]>();
  /** Whether the queue is waiting for the assignments. */
  readonly loading = input(false);
  /** The headline of the failure that prevented the consultation. */
  readonly errorTitle = input<string | null>(null);
  /** The detail of the failure that prevented the consultation. */
  readonly errorMessage = input<string | null>(null);
  /** The headline shown when the queue is empty. */
  readonly emptyTitle = input('No hay certificados pendientes');
  /** The supporting text shown when the queue is empty. */
  readonly emptyMessage = input('Todas las asignaciones cesadas tienen su certificado emitido.');
  /** The emblem shown when the queue is empty. */
  readonly emptyIcon = input('task_alt');

  /** The review of an assignment was requested. */
  readonly reviewRequested = output<string>();
  /** The consultation of the queue was requested again. */
  readonly retryRequested = output<void>();

  /**
   * formatDate writes a date of the platform in the language of the
   * interfaces.
   */
  protected formatDate(date: string): string {
    return formatCertificateDate(date);
  }
}
