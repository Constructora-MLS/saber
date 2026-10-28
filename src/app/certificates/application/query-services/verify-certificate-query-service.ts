import { inject, Injectable } from '@angular/core';
import { CertificateGateway } from '../../infrastructure/gateways/certificate.gateway';
import { CertificateVerification } from '../../domain/model/value-objects/certificate-verification';
import { CertificateCode } from '../../domain/model/value-objects/certificate-code';

@Injectable({ providedIn: 'root' })
export class VerifyCertificateQueryService {
  private readonly gateway = inject(CertificateGateway);

  async execute(code: string): Promise<CertificateVerification | null> {
    return this.gateway.verifyCertificate(code);
  }
}

@Injectable({ providedIn: 'root' })
export class GetPublicCertificateFileQueryService {
  private readonly gateway = inject(CertificateGateway);

  execute(code: string, signal?: AbortSignal): Promise<Blob> {
    return this.gateway.downloadPublicCertificateFile(
      CertificateCode.create(code).value,
      signal,
    );
  }
}
