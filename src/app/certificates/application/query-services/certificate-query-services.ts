import { inject, Injectable } from '@angular/core';
import {
  CertificateQueue,
  ListCertificatesQuery,
  ListingCriteria,
  ListingPage,
  ServiceTemplate,
} from '../queries/certificate-queries';
import { CertificateId } from '../../domain/model/value-objects/certificate-id';
import { CertificateGateway } from '../../infrastructure/gateways/certificate.gateway';
import { Certificate } from '../../domain/model/aggregates/certificate';
import { CERTIFICATE_PAGE_SIZE } from '../../domain/model/value-objects/listing';

@Injectable({ providedIn: 'root' })
export class ListCertificateQueueQueryService {
  private readonly gateway = inject(CertificateGateway);

  async execute(criteria: ListingCriteria = {}): Promise<CertificateQueue> {
    const result = await this.gateway.listEligibleAssignments({
      ...criteria,
      limit: CERTIFICATE_PAGE_SIZE,
    });
    return {
      ...result,
      items: result.items.map((assignment) => ({ assignment })),
    };
  }
}

@Injectable({ providedIn: 'root' })
export class ListCertificatesQueryService {
  private readonly gateway = inject(CertificateGateway);

  async execute(query: ListCertificatesQuery): Promise<ListingPage<Certificate>> {
    return this.gateway.listCertificates({
      workUnitCode: query.workUnitCode,
      search: query.search,
      status: query.status,
      limit: query.limit,
      page: query.page,
    });
  }
}

@Injectable({ providedIn: 'root' })
export class GetCertificatePreviewQueryService {
  private readonly gateway = inject(CertificateGateway);

  async execute(assignmentId: string, signal?: AbortSignal): Promise<Blob> {
    return this.gateway.previewCertificate(assignmentId, signal);
  }
}

@Injectable({ providedIn: 'root' })
export class GetServiceTemplatePreviewQueryService {
  private readonly gateway = inject(CertificateGateway);

  async execute(serviceId: string, body: string, signal?: AbortSignal): Promise<Blob> {
    return this.gateway.previewServiceTemplate(serviceId, body, signal);
  }
}

@Injectable({ providedIn: 'root' })
export class GetServiceTemplateQueryService {
  private readonly gateway = inject(CertificateGateway);

  async execute(serviceId: string): Promise<ServiceTemplate> {
    return this.gateway.findServiceTemplate(serviceId);
  }
}

@Injectable({ providedIn: 'root' })
export class GetCertificateFileQueryService {
  private readonly gateway = inject(CertificateGateway);
  private readonly files = new Map<string, Blob>();
  private cachedBytes = 0;
  private readonly maxEntries = 5;
  private readonly maxBytes = 10 * 1024 * 1024;

  async execute(certificateId: string, signal?: AbortSignal): Promise<Blob> {
    signal?.throwIfAborted();
    const cached = this.files.get(certificateId);
    if (cached) {
      this.files.delete(certificateId);
      this.files.set(certificateId, cached);
      return cached;
    }

    const file = await this.gateway.downloadCertificateFile(
      CertificateId.restore(certificateId),
      signal,
    );
    signal?.throwIfAborted();
    if (file.size <= this.maxBytes) {
      const previous = this.files.get(certificateId);
      if (previous) this.cachedBytes -= previous.size;
      this.files.delete(certificateId);
      this.files.set(certificateId, file);
      this.cachedBytes += file.size;
      while (this.files.size > this.maxEntries || this.cachedBytes > this.maxBytes) {
        const oldest = this.files.entries().next().value;
        if (!oldest) break;
        this.files.delete(oldest[0]);
        this.cachedBytes -= oldest[1].size;
      }
    }
    return file;
  }
}
