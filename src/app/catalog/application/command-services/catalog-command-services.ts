import { inject, Injectable } from '@angular/core';
import {
  CreatePositionCommand,
  CreateRegimeCommand,
  CreateServiceCommand,
  CreateWorkUnitCommand,
  DeletePositionCommand,
  DeleteRegimeCommand,
  DeleteServiceCommand,
  DeleteWorkUnitCommand,
  UpdatePositionCommand,
  UpdateRegimeCommand,
  UpdateServiceCommand,
  UpdateWorkUnitCommand,
} from '../commands/catalog-commands';
import { CatalogName } from '../../domain/model/value-objects/catalog-name';
import { CatalogValidationError } from '../../domain/model/errors/catalog-errors';
import { Description, isDescriptionEmpty } from '../../domain/model/value-objects/description';
import { CatalogGateway } from '../../infrastructure/gateways/catalog.gateway';
import { Position } from '../../domain/model/aggregates/position';
import { Regime } from '../../domain/model/aggregates/regime';
import { Service } from '../../domain/model/aggregates/service';
import { WorkUnit } from '../../domain/model/aggregates/work-unit';

@Injectable({ providedIn: 'root' })
export class CreateServiceCommandService {
  private readonly gateway = inject(CatalogGateway);

  async execute(command: CreateServiceCommand): Promise<Service> {
    const name = CatalogName.create(command.name);
    const description = this.description(command.description);

    return this.gateway.createService({ name, description });
  }

  private description(raw: string | null | undefined): Description | null {
    if (raw === null || raw === undefined || raw.trim().length === 0) {
      return null;
    }
    const description = Description.create(raw);
    return isDescriptionEmpty(description) ? null : description;
  }
}

@Injectable({ providedIn: 'root' })
export class CreatePositionCommandService {
  private readonly gateway = inject(CatalogGateway);

  async execute(command: CreatePositionCommand): Promise<Position> {
    const name = CatalogName.create(command.name);
    const description = this.description(command.description);

    return this.gateway.createPosition({ name, description });
  }

  private description(raw: string | null | undefined): Description | null {
    if (raw === null || raw === undefined || raw.trim().length === 0) {
      return null;
    }
    const description = Description.create(raw);
    return isDescriptionEmpty(description) ? null : description;
  }
}

@Injectable({ providedIn: 'root' })
export class CreateRegimeCommandService {
  private readonly gateway = inject(CatalogGateway);

  async execute(command: CreateRegimeCommand): Promise<Regime> {
    const name = CatalogName.create(command.name);
    const description = this.description(command.description);

    return this.gateway.createRegime({ name, description });
  }

  private description(raw: string | null | undefined): Description | null {
    if (raw === null || raw === undefined || raw.trim().length === 0) {
      return null;
    }
    const description = Description.create(raw);
    return isDescriptionEmpty(description) ? null : description;
  }
}

@Injectable({ providedIn: 'root' })
export class CreateWorkUnitCommandService {
  private readonly gateway = inject(CatalogGateway);

  async execute(command: CreateWorkUnitCommand): Promise<WorkUnit> {
    const name = CatalogName.create(command.name);
    const serviceId = command.serviceId.trim();
    if (serviceId.length === 0) {
      throw new CatalogValidationError('serviceId', 'La unidad de trabajo pertenece a un servicio.');
    }
    const description = this.description(command.description);

    return this.gateway.createWorkUnit({ name, description, serviceId });
  }

  private description(raw: string | null | undefined): Description | null {
    if (raw === null || raw === undefined || raw.trim().length === 0) {
      return null;
    }
    const description = Description.create(raw);
    return isDescriptionEmpty(description) ? null : description;
  }
}

@Injectable({ providedIn: 'root' })
export class UpdateServiceCommandService {
  private readonly gateway = inject(CatalogGateway);

  async execute(command: UpdateServiceCommand): Promise<Service> {
    const name = CatalogName.create(command.name);
    const description = this.description(command.description);

    return this.gateway.updateService({
      id: command.uuid,
      name,
      description,
      status: command.status,
    });
  }

  private description(raw: string): Description | null {
    const description = Description.create(raw);
    return isDescriptionEmpty(description) ? null : description;
  }
}

@Injectable({ providedIn: 'root' })
export class DeleteServiceCommandService {
  private readonly gateway = inject(CatalogGateway);

  async execute(command: DeleteServiceCommand): Promise<void> {
    await this.gateway.deleteService(command.uuid);
  }
}

@Injectable({ providedIn: 'root' })
export class UpdatePositionCommandService {
  private readonly gateway = inject(CatalogGateway);

  async execute(command: UpdatePositionCommand): Promise<Position> {
    const name = CatalogName.create(command.name);
    const description = this.description(command.description);

    return this.gateway.updatePosition({
      id: command.uuid,
      name,
      description,
      status: command.status,
    });
  }

  private description(raw: string): Description | null {
    const description = Description.create(raw);
    return isDescriptionEmpty(description) ? null : description;
  }
}

@Injectable({ providedIn: 'root' })
export class DeletePositionCommandService {
  private readonly gateway = inject(CatalogGateway);

  async execute(command: DeletePositionCommand): Promise<void> {
    await this.gateway.deletePosition(command.uuid);
  }
}

@Injectable({ providedIn: 'root' })
export class UpdateRegimeCommandService {
  private readonly gateway = inject(CatalogGateway);

  async execute(command: UpdateRegimeCommand): Promise<Regime> {
    const name = CatalogName.create(command.name);
    const description = this.description(command.description);

    return this.gateway.updateRegime({
      id: command.uuid,
      name,
      description,
      status: command.status,
    });
  }

  private description(raw: string): Description | null {
    const description = Description.create(raw);
    return isDescriptionEmpty(description) ? null : description;
  }
}

@Injectable({ providedIn: 'root' })
export class DeleteRegimeCommandService {
  private readonly gateway = inject(CatalogGateway);

  async execute(command: DeleteRegimeCommand): Promise<void> {
    await this.gateway.deleteRegime(command.uuid);
  }
}

@Injectable({ providedIn: 'root' })
export class UpdateWorkUnitCommandService {
  private readonly gateway = inject(CatalogGateway);

  async execute(command: UpdateWorkUnitCommand): Promise<WorkUnit> {
    const name = CatalogName.create(command.name);
    const description = this.description(command.description);
    const serviceId = command.serviceId?.trim();

    return this.gateway.updateWorkUnit({
      id: command.uuid,
      name,
      description,
      ...(serviceId ? { serviceId } : {}),
      status: command.status,
    });
  }

  private description(raw: string): Description | null {
    const description = Description.create(raw);
    return isDescriptionEmpty(description) ? null : description;
  }
}

@Injectable({ providedIn: 'root' })
export class DeleteWorkUnitCommandService {
  private readonly gateway = inject(CatalogGateway);

  async execute(command: DeleteWorkUnitCommand): Promise<void> {
    await this.gateway.deleteWorkUnit(command.uuid);
  }
}
