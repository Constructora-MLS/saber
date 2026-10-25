import { Provider } from '@angular/core';
import { CatalogServiceAcl } from './http/catalog-service-acl';
import { CertificateHttpGateway } from './http/certificate-http-gateway';
import { CERTIFICATE_REPOSITORY } from '../domain/repositories/certificate-repositories';
import { CERTIFICATE_SERVICE_RESOLVER } from '../domain/services/certificate-service-resolver';

/**
 * provideCertificates wires the Certificates bounded context.
 *
 * The context reads the certificates and the queue of the assignments that
 * may receive one from the API of the platform, and it resolves the name of
 * the services through the anti-corruption layer of the Catalog context.
 */
export function provideCertificates(): Provider[] {
  return [
    CertificateHttpGateway,
    CatalogServiceAcl,
    { provide: CERTIFICATE_REPOSITORY, useExisting: CertificateHttpGateway },
    { provide: CERTIFICATE_SERVICE_RESOLVER, useExisting: CatalogServiceAcl },
  ];
}
