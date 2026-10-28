import { inject, Injectable } from '@angular/core';
import {
  AnnulCertificateCommand,
  IssueCertificateCommand,
  RestoreServiceTemplateCommand,
  SaveServiceTemplateCommand,
} from '../commands/certificate-commands';
import { Certificate } from '../../domain/model/aggregates/certificate';
import { CertificateId, restoreCertificateId } from '../../domain/model/value-objects/certificate-id';
import { CertificateGateway } from '../../infrastructure/gateways/certificate.gateway';
import { ServiceTemplate } from '../queries/certificate-queries';

@Injectable({ providedIn: 'root' })
export class IssueCertificateCommandService {
  private readonly gateway = inject(CertificateGateway);

  async execute(command: IssueCertificateCommand): Promise<Certificate> {
    return this.gateway.issueCertificate(command.assignmentId);
  }
}

@Injectable({ providedIn: 'root' })
export class SaveServiceTemplateCommandService {
  private readonly gateway = inject(CertificateGateway);

  async execute(command: SaveServiceTemplateCommand): Promise<ServiceTemplate> {
    return this.gateway.saveServiceTemplate(command.serviceId, command.body);
  }
}

@Injectable({ providedIn: 'root' })
export class RestoreServiceTemplateCommandService {
  private readonly gateway = inject(CertificateGateway);

  async execute(command: RestoreServiceTemplateCommand): Promise<ServiceTemplate> {
    return this.gateway.restoreServiceTemplate(command.serviceId);
  }
}

@Injectable({ providedIn: 'root' })
export class AnnulCertificateCommandService {
  private readonly gateway = inject(CertificateGateway);

  async execute(command: AnnulCertificateCommand): Promise<Certificate> {
    return this.gateway.annulCertificate(
      restoreCertificateId(command.certificateId),
      command.reason.trim(),
    );
  }
}
