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
  of,
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
  PublicCertificateSnapshotResource,
  ServiceTemplateResource,
} from '../contracts/certificate.contract';
import { toCertificateApiError } from '../errors/certificate-api.error';
import { Certificate } from '../../domain/model/aggregates/certificate';
import { CertificateCode, restoreCertificateCode } from '../../domain/model/value-objects/certificate-code';
import { CertificateId, restoreCertificateId } from '../../domain/model/value-objects/certificate-id';
import { CertificateSnapshot, restoreCertificateSnapshot } from '../../domain/model/value-objects/certificate-snapshot';
import { CertificateVerification } from '../../domain/model/value-objects/certificate-verification';
import { CertificateStatus } from '../../domain/model/value-objects/certificate-status';
import { SNAPSHOT_FIELD } from '../../domain/model/value-objects/certificate-snapshot';
import {
  CertificateCriteria,
  EligibleAssignment,
  ListingCriteria,
  ListingPage,
  ServiceTemplate,
} from '../../application/queries/certificate-queries';

/**
 * CertificateGateway is the communication boundary with the Certificates API.
 */
@Injectable({ providedIn: 'root' })
export class CertificateGateway {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  async listEligibleAssignments(
    criteria: ListingCriteria = {},
  ): Promise<ListingPage<EligibleAssignment>> {
    const queue = await firstValueFrom(
      this.http
        .get<EligibleAssignmentListResource>(`${this.baseUrl}/certificates/eligible-assignments`, {
          params: this.eligibleAssignmentParams(criteria),
        })
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return { ...queue, items: queue.items.map((item) => this.toEligibleAssignment(item)) };
  }

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

  async verifyCertificate(code: string): Promise<CertificateVerification | null> {
    const resource = await firstValueFrom(
      this.http
        .get<CertificateVerificationResource>(
          `${this.baseUrl}/certificates/verify/${encodeURIComponent(code)}`,
        )
        .pipe(
          catchError((error: HttpErrorResponse) =>
            error.status === 404 ? of(null) : this.toFailure(error),
          ),
        ),
    );
    if (!resource) return null;

    return CertificateVerification.restore(
      resource.code,
      this.status(resource.status),
      this.toPublicSnapshot(resource.data),
      resource.issuedAt,
    );
  }

  private certificateParams(criteria: CertificateCriteria): Record<string, string> {
    return {
      ...this.pageParams(criteria),
      ...(criteria.status ? { status: criteria.status } : {}),
      ...(criteria.workUnitCode ? { workUnitCode: criteria.workUnitCode } : {}),
    };
  }

  private pageParams(criteria: ListingCriteria | CertificateCriteria): Record<string, string> {
    const params: Record<string, string> = { page: `${criteria.page ?? 1}` };
    if (criteria.search?.trim()) params['q'] = criteria.search.trim();

    if (criteria.limit !== undefined) {
      params['limit'] = `${criteria.limit}`;
    }
    if (criteria.page !== undefined) {
      params['page'] = `${criteria.page}`;
    }

    return params;
  }

  private eligibleAssignmentParams(criteria: ListingCriteria): Record<string, string> {
    return {
      ...this.pageParams(criteria),
      ...(criteria.serviceId ? { serviceId: criteria.serviceId } : {}),
    };
  }

  async issueCertificate(assignmentId: string): Promise<Certificate> {
    const request: IssueCertificateRequest = { assignmentId };

    const issued = await firstValueFrom(
      this.http
        .post<CertificateResource>(`${this.baseUrl}/certificates`, request)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return this.toCertificate(issued);
  }

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

  async annulCertificate(id: CertificateId, reason: string): Promise<Certificate> {
    const request: AnnulCertificateRequest = { reason };

    const annulled = await firstValueFrom(
      this.http
        .post<CertificateResource>(`${this.baseUrl}/certificates/${id}/annul`, request)
        .pipe(catchError((error: HttpErrorResponse) => this.toFailure(error))),
    );

    return this.toCertificate(annulled);
  }

  async downloadCertificateFile(id: CertificateId, signal?: AbortSignal): Promise<Blob> {
    return this.readFile(
      this.http.get(`${this.baseUrl}/certificates/${id}/file`, { responseType: 'blob' }),
      signal,
    );
  }

  async downloadPublicCertificateFile(code: string, signal?: AbortSignal): Promise<Blob> {
    return this.readFile(
      this.http.get(`${this.baseUrl}/certificates/verify/${encodeURIComponent(code)}/file`, {
        responseType: 'blob',
      }),
      signal,
    );
  }

  async previewCertificate(assignmentId: string, signal?: AbortSignal): Promise<Blob> {
    return this.readFile(
      this.http.get(`${this.baseUrl}/assignments/${assignmentId}/certificate-preview`, {
        responseType: 'blob',
      }),
      signal,
    );
  }

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

  private toFailure(error: HttpErrorResponse) {
    return throwError(() => toCertificateApiError(error.status, error.error));
  }

  private toFileFailure(error: HttpErrorResponse): Observable<never> {
    return from(this.problemOf(error)).pipe(
      mergeMap((body) => throwError(() => toCertificateApiError(error.status, body))),
    );
  }

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

  private toEligibleAssignment(resource: EligibleAssignmentResource): EligibleAssignment {
    return {
      assignmentId: resource.ID,
      serviceId: resource.ServiceID,
      endDate: resource.EndDate,
      snapshot: this.toSnapshot(resource.Data),
    };
  }

  private toCertificate(resource: CertificateResource): Certificate {
    return Certificate.restore(
      restoreCertificateId(resource.id),
      restoreCertificateCode(resource.code),
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

  private toSnapshot(resource: CertificateSnapshotResource): CertificateSnapshot {
    return restoreCertificateSnapshot(
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

  private toPublicSnapshot(resource: PublicCertificateSnapshotResource): CertificateSnapshot {
    return restoreCertificateSnapshot(
      new Map<string, string>([
        [SNAPSHOT_FIELD.employeeFirstName, resource['employee.firstName'] ?? ''],
        [SNAPSHOT_FIELD.employeeLastName, resource['employee.lastName'] ?? ''],
        [SNAPSHOT_FIELD.employeePaternalSurname, resource['employee.paternalSurname'] ?? ''],
        [SNAPSHOT_FIELD.employeeMaternalSurname, resource['employee.maternalSurname'] ?? ''],
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

  private status(raw: CertificateStatusResource): CertificateStatus {
    return raw === 'ISSUED' ? 'ISSUED' : 'ANNULLED';
  }
}
