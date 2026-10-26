// Package http holds the adapter that talks to the API of the Certificates
// bounded context.
//
// The gateway is the anti-corruption layer: it translates the published
// contract into the language of the domain.
// package http

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  catchError,
  firstValueFrom,
  from,
  fromEvent,
  mergeMap,
  NEVER,
  Observable,
  takeUntil,
  throwError,
} from 'rxjs';
import { API_BASE_URL } from '../../../api.config';
import {
  AnnulCertificateRequest,
  CertificateListResource,
  CertificateResource,
  CertificateSnapshotResource,
  CertificateStatusResource,
  CertificateVerificationResource,
  EligibleAssignmentListResource,
  EligibleAssignmentResource,
  IssueCertificateRequest,
  ServiceTemplateResource,
} from './certificate-api.contract';
import { toCertificateApiError } from './certificate-api.error';
import { Certificate } from '../../domain/model/aggregates/certificate';
import { CertificateCode } from '../../domain/model/value-objects/certificate-code';
import { CertificateId } from '../../domain/model/value-objects/certificate-id';
import { CertificateSnapshot } from '../../domain/model/value-objects/certificate-snapshot';
import { CertificateVerification } from '../../domain/model/value-objects/certificate-verification';
import { CertificateStatus } from '../../domain/model/value-objects/certificate-status';
import { SNAPSHOT_FIELD } from '../../domain/model/value-objects/certificate-snapshot';
import {
  CertificateCriteria,
  CertificateRepository,
  EligibleAssignment,
  ListingCriteria,
  ListingPage,
  ServiceTemplate,
} from '../../domain/repositories/certificate-repositories';

/**
 * CertificateHttpGateway is the adapter of the registry of the certificates.
 */
@Injectable()
export class CertificateHttpGateway implements CertificateRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * listEligibleAssignments returns the assignments whose labour period is
   * closed and that may receive a certificate.
   */
  async listEligibleAssignments(
    criteria: ListingCriteria = {},
  ): Promise<ListingPage<EligibleAssignment>> {
    const queue = await firstValueFrom(
      this.http
        .get<EligibleAssignmentListResource>(`${this.baseUrl}/certificates/eligible-assignments`, {
          params: this.pageParams(criteria),
        })
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return { ...queue, items: queue.items.map((item) => this.toEligibleAssignment(item)) };
  }

  /**
   * listCertificates returns the certificates of the platform that match the
   * criteria.
   *
   * The search of the certificates is filtered by state, so the platform
   * answers the certificates in force, the certificates that were annulled,
   * or every certificate.
   */
  async listCertificates(criteria: CertificateCriteria): Promise<ListingPage<Certificate>> {
    const listing = await firstValueFrom(
      this.http
        .get<CertificateListResource>(`${this.baseUrl}/certificates`, {
          params: this.certificateParams(criteria),
        })
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return { ...listing, items: listing.items.map((item) => this.toCertificate(item)) };
  }

  /**
   * verifyCertificate returns the public trace of a certificate.
   *
   * The verification reads the certificate by its public code, the identity
   * that the document prints and that the QR of the document carries.
   */
  async verifyCertificate(code: string): Promise<CertificateVerification> {
    const resource = await firstValueFrom(
      this.http
        .get<CertificateVerificationResource>(
          `${this.baseUrl}/certificates/verify/${encodeURIComponent(code)}`,
        )
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return CertificateVerification.restore(
      resource.code,
      this.status(resource.status),
      this.toSnapshot(resource.data),
      resource.issuedAt,
      resource.annulledAt ?? null,
      resource.annulmentReason ?? null,
    );
  }

  /**
   * certificateParams are the filters of the search of the certificates.
   *
   * The state is sent only when the search filters by it, so the platform
   * lists every certificate when the filter is every certificate.
   */
  private certificateParams(criteria: CertificateCriteria): Record<string, string> {
    return {
      ...this.pageParams(criteria),
      ...(criteria.status ? { status: criteria.status } : {}),
    };
  }

  /**
   * pageParams are the pagination of a listing.
   */
  private pageParams(criteria: ListingCriteria): Record<string, string> {
    const params: Record<string, string> = { page: `${criteria.page ?? 1}` };
    if (criteria.search?.trim()) params['q'] = criteria.search.trim();
    if (criteria.serviceId) params['serviceId'] = criteria.serviceId;

    if (criteria.limit !== undefined) {
      params['limit'] = `${criteria.limit}`;
    }
    if (criteria.page !== undefined) {
      params['page'] = `${criteria.page}`;
    }

    return params;
  }

  /**
   * issueCertificate issues the certificate of an eligible assignment.
   */
  async issueCertificate(assignmentId: string): Promise<Certificate> {
    const request: IssueCertificateRequest = { assignmentId };

    const issued = await firstValueFrom(
      this.http
        .post<CertificateResource>(`${this.baseUrl}/certificates`, request)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return this.toCertificate(issued);
  }

  /**
   * findCertificate reads a certificate, when it exists.
   */
  async findCertificate(id: CertificateId): Promise<Certificate | null> {
    const certificate = await firstValueFrom(
      this.http
        .get<CertificateResource>(`${this.baseUrl}/certificates/${id.value}`)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return this.toCertificate(certificate);
  }

  /**
   * listAssignmentCertificates returns the issuance history of an
   * assignment, the newest one first.
   */
  async listAssignmentCertificates(assignmentId: string): Promise<readonly Certificate[]> {
    const history = await firstValueFrom(
      this.http
        .get<CertificateListResource>(`${this.baseUrl}/assignments/${assignmentId}/certificates`)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return history.items.map((item) => this.toCertificate(item));
  }

  /**
   * findServiceTemplate returns the template of a service.
   */
  async findServiceTemplate(serviceId: string): Promise<ServiceTemplate> {
    const template = await firstValueFrom(
      this.http
        .get<ServiceTemplateResource>(`${this.baseUrl}/services/${serviceId}/certificate-template`)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return {
      serviceId: template.serviceId,
      body: template.body,
      tokens: template.tokens,
    };
  }

  /**
   * saveServiceTemplate replaces the template of a service.
   */
  async saveServiceTemplate(serviceId: string, body: string): Promise<ServiceTemplate> {
    const template = await firstValueFrom(
      this.http
        .put<ServiceTemplateResource>(
          `${this.baseUrl}/services/${serviceId}/certificate-template`,
          {
            body,
          },
        )
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return {
      serviceId: template.serviceId,
      body: template.body,
      tokens: template.tokens,
    };
  }

  /**
   * restoreServiceTemplate replaces the template of a service with the
   * default one of the platform.
   */
  async restoreServiceTemplate(serviceId: string): Promise<ServiceTemplate> {
    const template = await firstValueFrom(
      this.http
        .post<ServiceTemplateResource>(
          `${this.baseUrl}/services/${serviceId}/certificate-template/restore`,
          {},
        )
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return {
      serviceId: template.serviceId,
      body: template.body,
      tokens: template.tokens,
    };
  }

  /**
   * annulCertificate annuls an issued certificate.
   *
   * The annulment keeps the history and the file of the issuance: it only
   * declares that the certificate is not in force anymore.
   */
  async annulCertificate(id: CertificateId, reason: string): Promise<Certificate> {
    const request: AnnulCertificateRequest = { reason };

    const annulled = await firstValueFrom(
      this.http
        .post<CertificateResource>(`${this.baseUrl}/certificates/${id.value}/annul`, request)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return this.toCertificate(annulled);
  }

  /**
   * downloadCertificateFile reads the PDF that the platform archived.
   */
  async downloadCertificateFile(id: CertificateId, signal?: AbortSignal): Promise<Blob> {
    return this.readFile(
      this.http.get(`${this.baseUrl}/certificates/${id.value}/file`, { responseType: 'blob' }),
      signal,
    );
  }

  /**
   * previewCertificate renders the certificate of an assignment without
   * archiving it.
   *
   * The preview is the document that the platform would archive, so the
   * worker sees exactly the certificate that the issuance keeps.
   */
  async previewCertificate(assignmentId: string, signal?: AbortSignal): Promise<Blob> {
    return this.readFile(
      this.http.get(`${this.baseUrl}/assignments/${assignmentId}/certificate-preview`, {
        responseType: 'blob',
      }),
      signal,
    );
  }

  /**
   * previewServiceTemplate renders the certificate of a service with a
   * template that is not stored yet.
   *
   * The editor of the content of a service uses it to show the document
   * that the text being written would produce. It does not need a labour
   * period: the platform renders the shape of the certificate.
   */
  async previewServiceTemplate(
    serviceId: string,
    body: string,
    signal?: AbortSignal,
  ): Promise<Blob> {
    return this.readFile(
      this.http.post(
        `${this.baseUrl}/services/${serviceId}/certificate-preview`,
        { body },
        { responseType: 'blob' },
      ),
      signal,
    );
  }

  /** Unsubscribing aborts Angular's HTTP request, including pending error-body reads. */
  private async readFile(request: Observable<Blob>, signal?: AbortSignal): Promise<Blob> {
    signal?.throwIfAborted();
    try {
      return await firstValueFrom(
        request.pipe(
          catchError((error: HttpErrorResponse) => this.toFileFailure(error)),
          takeUntil(signal ? fromEvent(signal, 'abort') : NEVER),
        ),
      );
    } catch (error) {
      signal?.throwIfAborted();
      throw error;
    }
  }

  /**
   * toFailure translates a failed response into the error of the context.
   */
  private toFailure(error: HttpErrorResponse) {
    return throwError(() => toCertificateApiError(error.status, error.error));
  }

  /**
   * toFileFailure translates the failed response of a file into the error of
   * the context.
   *
   * The body of a file is a blob, so the problem details are read from the
   * text of the blob before they are translated.
   */
  private toFileFailure(error: HttpErrorResponse): Observable<never> {
    return from(this.problemOf(error)).pipe(
      mergeMap((body) => throwError(() => toCertificateApiError(error.status, body))),
    );
  }

  /**
   * problemOf reads the body of a failed response.
   */
  private async problemOf(error: HttpErrorResponse): Promise<unknown> {
    if (!(error.error instanceof Blob)) {
      return error.error;
    }

    const text = await error.error.text();
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  /**
   * toEligibleAssignment rebuilds an eligible assignment from its published
   * representation.
   */
  private toEligibleAssignment(resource: EligibleAssignmentResource): EligibleAssignment {
    return {
      assignmentId: resource.ID,
      serviceId: resource.ServiceID,
      endDate: resource.EndDate,
      snapshot: this.toSnapshot(resource.Data),
    };
  }

  /**
   * toCertificate rebuilds the certificate from its published representation.
   */
  private toCertificate(resource: CertificateResource): Certificate {
    return Certificate.restore(
      CertificateId.restore(resource.id),
      CertificateCode.restore(resource.code),
      resource.assignmentId,
      resource.serviceId,
      this.status(resource.status),
      this.toSnapshot(resource.dataSnapshot),
      resource.issuedAt,
      resource.annulledAt ?? null,
      resource.annulmentReason ?? null,
      resource.replacementOf ?? null,
    );
  }

  /**
   * toSnapshot rebuilds the archived data from its published representation.
   */
  private toSnapshot(resource: CertificateSnapshotResource): CertificateSnapshot {
    return CertificateSnapshot.restore(
      new Map<string, string>([
        [SNAPSHOT_FIELD.employeeFirstName, resource['employee.firstName'] ?? ''],
        [SNAPSHOT_FIELD.employeeLastName, resource['employee.lastName'] ?? ''],
        [SNAPSHOT_FIELD.employeePaternalSurname, resource['employee.paternalSurname'] ?? ''],
        [SNAPSHOT_FIELD.employeeMaternalSurname, resource['employee.maternalSurname'] ?? ''],
        [SNAPSHOT_FIELD.employeeDni, resource['employee.dni'] ?? ''],
        [SNAPSHOT_FIELD.assignmentPosition, resource['assignment.position'] ?? ''],
        [SNAPSHOT_FIELD.assignmentService, resource['assignment.service'] ?? ''],
        [SNAPSHOT_FIELD.assignmentWorkUnit, resource['assignment.workUnit'] ?? ''],
        [SNAPSHOT_FIELD.assignmentWorkUnitCode, resource['assignment.workUnitCode'] ?? ''],
        [SNAPSHOT_FIELD.assignmentStartDate, resource['assignment.startDate'] ?? ''],
        [SNAPSHOT_FIELD.assignmentEndDate, resource['assignment.endDate'] ?? ''],
        [SNAPSHOT_FIELD.issueDate, resource['issueDate'] ?? ''],
      ]),
    );
  }

  /**
   * status reads the state published for a certificate.
   *
   * A state that the context does not know is reported as annulled, so an
   * unknown state never shows a certificate as in force.
   */
  private status(raw: CertificateStatusResource): CertificateStatus {
    return raw === 'ISSUED' ? 'ISSUED' : 'ANNULLED';
  }
}
