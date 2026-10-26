// Package queryservices holds the use cases that read the state of the
// Certificates bounded context.
// package queryservices

import { inject, Injectable } from '@angular/core';
import { CERTIFICATE_REPOSITORY } from '../../domain/repositories/certificate-repositories';
import { CertificateVerification } from '../../domain/model/value-objects/certificate-verification';
import { CertificateCode } from '../../domain/model/value-objects/certificate-code';

/**
 * VerifyCertificateQueryService returns the public trace of a certificate.
 *
 * The verification answers the question that the QR of the document asks:
 * whether the certificate is genuine and what it certifies. It reads the
 * certificate by its public code, so the identifier of the record never
 * travels.
 */
@Injectable({ providedIn: 'root' })
export class VerifyCertificateQueryService {
  private readonly repository = inject(CERTIFICATE_REPOSITORY);

  async execute(code: string): Promise<CertificateVerification | null> {
    return this.repository.verifyCertificate(code);
  }
}

/** Reads a public certificate's PDF; every call checks its current state. */
@Injectable({ providedIn: 'root' })
export class GetPublicCertificateFileQueryService {
  private readonly repository = inject(CERTIFICATE_REPOSITORY);

  execute(code: string, signal?: AbortSignal): Promise<Blob> {
    return this.repository.downloadPublicCertificateFile(
      CertificateCode.create(code).value,
      signal,
    );
  }
}
