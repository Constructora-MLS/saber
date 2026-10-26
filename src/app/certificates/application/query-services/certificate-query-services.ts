// Package queryservices holds the use cases that read the state of the
// Certificates bounded context.
// package queryservices

import { inject, Injectable } from '@angular/core';
import { CertificateQueue, ListCertificatesQuery } from '../queries/certificate-queries';
import { CertificateId } from '../../domain/model/value-objects/certificate-id';
import {
  CERTIFICATE_REPOSITORY,
  ServiceTemplate,
  ListingCriteria,
  ListingPage,
} from '../../domain/repositories/certificate-repositories';
import { Certificate } from '../../domain/model/aggregates/certificate';
import { CERTIFICATE_PAGE_SIZE } from '../../domain/model/value-objects/listing';

/**
 * ListCertificateQueueQueryService returns the queue of the assignments
 * that may receive a certificate.
 *
 * The platform excludes assignments with an issuance in force before
 * pagination, so the client preserves its page totals without extra history requests.
 */
@Injectable({ providedIn: 'root' })
export class ListCertificateQueueQueryService {
  private readonly repository = inject(CERTIFICATE_REPOSITORY);

  async execute(criteria: ListingCriteria = {}): Promise<CertificateQueue> {
    const result = await this.repository.listEligibleAssignments({
      ...criteria,
      limit: CERTIFICATE_PAGE_SIZE,
    });
    // The backend excludes assignments with an issuance in force before pagination.
    return {
      ...result,
      items: result.items.map((assignment) => ({ assignment })),
    };
  }
}

/**
 * ListCertificatesQueryService returns the certificates of the platform that
 * match the query.
 *
 * The search of the certificates is filtered by state, so the platform
 * answers the certificates that the worker is looking for.
 */
@Injectable({ providedIn: 'root' })
export class ListCertificatesQueryService {
  private readonly repository = inject(CERTIFICATE_REPOSITORY);

  async execute(query: ListCertificatesQuery): Promise<ListingPage<Certificate>> {
    return this.repository.listCertificates({
      search: query.search,
      status: query.status,
      limit: query.limit,
      page: query.page,
    });
  }
}

/**
 * GetCertificatePreviewQueryService returns the PDF that the issuance of an
 * assignment would archive.
 *
 * The preview is the document that the platform renders, so the worker sees
 * exactly the certificate that the platform will keep.
 */
@Injectable({ providedIn: 'root' })
export class GetCertificatePreviewQueryService {
  private readonly repository = inject(CERTIFICATE_REPOSITORY);

  async execute(assignmentId: string): Promise<Blob> {
    return this.repository.previewCertificate(assignmentId);
  }
}

/**
 * GetServiceTemplatePreviewQueryService returns the document that the text
 * of a service would produce.
 *
 * The preview does not need a labour period: the platform renders the shape
 * of the certificate over the example of the domain.
 */
@Injectable({ providedIn: 'root' })
export class GetServiceTemplatePreviewQueryService {
  private readonly repository = inject(CERTIFICATE_REPOSITORY);

  async execute(serviceId: string, body: string): Promise<Blob> {
    return this.repository.previewServiceTemplate(serviceId, body);
  }
}

/**
 * GetServiceTemplateQueryService returns the template of a service.
 */
@Injectable({ providedIn: 'root' })
export class GetServiceTemplateQueryService {
  private readonly repository = inject(CERTIFICATE_REPOSITORY);

  async execute(serviceId: string): Promise<ServiceTemplate> {
    return this.repository.findServiceTemplate(serviceId);
  }
}

/**
 * GetCertificateFileQueryService returns the PDF that the platform
 * archived for a certificate.
 */
@Injectable({ providedIn: 'root' })
export class GetCertificateFileQueryService {
  private readonly repository = inject(CERTIFICATE_REPOSITORY);

  async execute(certificateId: string): Promise<Blob> {
    return this.repository.downloadCertificateFile(CertificateId.restore(certificateId));
  }
}
