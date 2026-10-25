// Package commandservices holds the use cases that change the state of the
// Certificates bounded context.
// package commandservices

import { inject, Injectable } from '@angular/core';
import {
  AnnulCertificateCommand,
  IssueCertificateCommand,
  RestoreServiceTemplateCommand,
  SaveServiceTemplateCommand,
} from '../commands/certificate-commands';
import { Certificate } from '../../domain/model/aggregates/certificate';
import { CertificateId } from '../../domain/model/value-objects/certificate-id';
import {
  CERTIFICATE_REPOSITORY,
  ServiceTemplate,
} from '../../domain/repositories/certificate-repositories';

/**
 * IssueCertificateCommandService issues the certificate of an assignment
 * whose labour period is closed.
 *
 * The platform renders the PDF and archives it: the service only asks for
 * the issuance and hands the certificate to the interfaces.
 */
@Injectable({ providedIn: 'root' })
export class IssueCertificateCommandService {
  private readonly repository = inject(CERTIFICATE_REPOSITORY);

  async execute(command: IssueCertificateCommand): Promise<Certificate> {
    return this.repository.issueCertificate(command.assignmentId);
  }
}

/**
 * SaveServiceTemplateCommandService replaces the template of a service.
 *
 * The platform validates the template before it accepts it, so a template
 * with an unknown placeholder never reaches the catalog of the services.
 */
@Injectable({ providedIn: 'root' })
export class SaveServiceTemplateCommandService {
  private readonly repository = inject(CERTIFICATE_REPOSITORY);

  async execute(command: SaveServiceTemplateCommand): Promise<ServiceTemplate> {
    return this.repository.saveServiceTemplate(command.serviceId, command.body);
  }
}

/**
 * RestoreServiceTemplateCommandService replaces the template of a service
 * with the default one of the platform.
 *
 * The default belongs to the platform, so the client never carries a copy of
 * it: the command only names the service.
 */
@Injectable({ providedIn: 'root' })
export class RestoreServiceTemplateCommandService {
  private readonly repository = inject(CERTIFICATE_REPOSITORY);

  async execute(command: RestoreServiceTemplateCommand): Promise<ServiceTemplate> {
    return this.repository.restoreServiceTemplate(command.serviceId);
  }
}

/**
 * AnnulCertificateCommandService annuls an issued certificate.
 *
 * The annulment keeps the history and the file of the issuance: it declares
 * that the certificate is not in force anymore, which is what happens when
 * a certificate was issued by mistake.
 */
@Injectable({ providedIn: 'root' })
export class AnnulCertificateCommandService {
  private readonly repository = inject(CERTIFICATE_REPOSITORY);

  async execute(command: AnnulCertificateCommand): Promise<Certificate> {
    return this.repository.annulCertificate(
      CertificateId.restore(command.certificateId),
      command.reason,
    );
  }
}
