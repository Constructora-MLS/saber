// Package queryservices holds the use cases that read the state of the
// Certificates bounded context.
// package queryservices

import { inject, Injectable } from '@angular/core';
import { CertificateDraft, CertificateQueue } from '../queries/certificate-queries';
import { CertificateId } from '../../domain/model/value-objects/certificate-id';
import {
  CERTIFICATE_REPOSITORY,
  EligibleAssignment,
  ServiceTemplate,
} from '../../domain/repositories/certificate-repositories';
import { CERTIFICATE_SERVICE_RESOLVER } from '../../domain/services/certificate-service-resolver';

/**
 * ListCertificateQueueQueryService returns the queue of the assignments
 * that may receive a certificate.
 *
 * The queue carries the history of every assignment, because the platform
 * publishes the history of an assignment and not the list of the
 * certificates of the platform: an assignment that already has a
 * certificate is not waiting for one anymore.
 */
@Injectable({ providedIn: 'root' })
export class ListCertificateQueueQueryService {
  private readonly repository = inject(CERTIFICATE_REPOSITORY);

  async execute(): Promise<CertificateQueue> {
    const assignments = await this.repository.listEligibleAssignments();
    const histories = await Promise.all(
      assignments.map((assignment) =>
        this.repository.listAssignmentCertificates(assignment.assignmentId),
      ),
    );

    return {
      items: assignments.map((assignment, index) => ({
        assignment,
        certificates: histories[index] ?? [],
      })),
    };
  }
}

/**
 * GetCertificateDraftQueryService returns the certificate that is about to
 * be issued for an assignment.
 *
 * The draft is null when the assignment is not in the queue: an assignment
 * whose labour period is still open does not receive a certificate.
 */
@Injectable({ providedIn: 'root' })
export class GetCertificateDraftQueryService {
  private readonly repository = inject(CERTIFICATE_REPOSITORY);
  private readonly services = inject(CERTIFICATE_SERVICE_RESOLVER);

  async execute(assignmentId: string): Promise<CertificateDraft | null> {
    const assignments = await this.repository.listEligibleAssignments();
    const assignment = assignments.find((item) => item.assignmentId === assignmentId);

    if (!assignment) {
      return null;
    }

    const [certificates, names] = await Promise.all([
      this.repository.listAssignmentCertificates(assignment.assignmentId),
      this.services.resolveServiceNames([assignment.serviceId]),
    ]);

    return {
      assignment,
      serviceName: names.get(assignment.serviceId) ?? null,
      certificates,
    };
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
