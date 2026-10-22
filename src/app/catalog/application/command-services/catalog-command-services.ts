// Package commandservices holds the use cases that change the state of the
// Catalog bounded context.
//
// Every use case validates the intent of the command against the invariants
// of the domain before it reaches the registry.
// package commandservices

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
import { Description } from '../../domain/model/value-objects/description';
import { REGIME_CHANGED } from '../../domain/model/events/regime-changed.event';
import { DomainEventBus } from '../../../shared/infrastructure/domain-event-bus';
import {
  POSITION_REPOSITORY,
  REGIME_REPOSITORY,
  SERVICE_REPOSITORY,
  WORK_UNIT_REPOSITORY,
} from '../../domain/repositories/catalog-repositories';
import { Position } from '../../domain/model/aggregates/position';
import { Regime } from '../../domain/model/aggregates/regime';
import { Service } from '../../domain/model/aggregates/service';
import { WorkUnit } from '../../domain/model/aggregates/work-unit';

/**
 * CreateServiceCommandService registers a service in the catalog.
 */
@Injectable({ providedIn: 'root' })
export class CreateServiceCommandService {
  private readonly repository = inject(SERVICE_REPOSITORY);

  async execute(command: CreateServiceCommand): Promise<Service> {
    const name = CatalogName.create(command.name);
    const description = this.description(command.description);

    return this.repository.createService({ name, description });
  }

  private description(raw: string | null | undefined): Description | null {
    if (raw === null || raw === undefined || raw.trim().length === 0) {
      return null;
    }
    const description = Description.create(raw);
    return description.isEmpty ? null : description;
  }
}

/**
 * CreatePositionCommandService registers a position in the catalog.
 */
@Injectable({ providedIn: 'root' })
export class CreatePositionCommandService {
  private readonly repository = inject(POSITION_REPOSITORY);

  async execute(command: CreatePositionCommand): Promise<Position> {
    const name = CatalogName.create(command.name);
    const description = this.description(command.description);

    return this.repository.createPosition({ name, description });
  }

  private description(raw: string | null | undefined): Description | null {
    if (raw === null || raw === undefined || raw.trim().length === 0) {
      return null;
    }
    const description = Description.create(raw);
    return description.isEmpty ? null : description;
  }
}

/**
 * CreateRegimeCommandService registers a regime in the catalog.
 */
@Injectable({ providedIn: 'root' })
export class CreateRegimeCommandService {
  private readonly repository = inject(REGIME_REPOSITORY);
  private readonly events = inject(DomainEventBus);

  async execute(command: CreateRegimeCommand): Promise<Regime> {
    const name = CatalogName.create(command.name);
    const description = this.description(command.description);

    const regime = await this.repository.createRegime({ name, description });
    this.events.publish({
      kind: REGIME_CHANGED,
      regimeId: regime.id,
      occurredOn: new Date(),
    });

    return regime;
  }

  private description(raw: string | null | undefined): Description | null {
    if (raw === null || raw === undefined || raw.trim().length === 0) {
      return null;
    }
    const description = Description.create(raw);
    return description.isEmpty ? null : description;
  }
}

/**
 * CreateWorkUnitCommandService registers a work unit in the catalog.
 */
@Injectable({ providedIn: 'root' })
export class CreateWorkUnitCommandService {
  private readonly repository = inject(WORK_UNIT_REPOSITORY);

  async execute(command: CreateWorkUnitCommand): Promise<WorkUnit> {
    const name = CatalogName.create(command.name);
    const serviceId = command.serviceId.trim();
    if (serviceId.length === 0) {
      throw new Error('La unidad de trabajo pertenece a un servicio.');
    }
    const description = this.description(command.description);

    return this.repository.createWorkUnit({ name, description, serviceId });
  }

  private description(raw: string | null | undefined): Description | null {
    if (raw === null || raw === undefined || raw.trim().length === 0) {
      return null;
    }
    const description = Description.create(raw);
    return description.isEmpty ? null : description;
  }
}

/**
 * UpdateServiceCommandService modifies a service.
 *
 * The command carries the whole set of the editable fields, so the
 * modification never leaves a field of the record in an unknown state.
 */
@Injectable({ providedIn: 'root' })
export class UpdateServiceCommandService {
  private readonly repository = inject(SERVICE_REPOSITORY);

  async execute(command: UpdateServiceCommand): Promise<Service> {
    const name = CatalogName.create(command.name);
    const description = this.description(command.description);

    return this.repository.updateService({
      id: command.uuid,
      name,
      description,
      status: command.status,
    });
  }

  private description(raw: string): Description | null {
    const description = Description.create(raw);
    return description.isEmpty ? null : description;
  }
}

/**
 * DeleteServiceCommandService logically deletes a service.
 */
@Injectable({ providedIn: 'root' })
export class DeleteServiceCommandService {
  private readonly repository = inject(SERVICE_REPOSITORY);

  async execute(command: DeleteServiceCommand): Promise<void> {
    await this.repository.deleteService(command.uuid);
  }
}

/**
 * UpdatePositionCommandService modifies a position.
 */
@Injectable({ providedIn: 'root' })
export class UpdatePositionCommandService {
  private readonly repository = inject(POSITION_REPOSITORY);

  async execute(command: UpdatePositionCommand): Promise<Position> {
    const name = CatalogName.create(command.name);
    const description = this.description(command.description);

    return this.repository.updatePosition({
      id: command.uuid,
      name,
      description,
      status: command.status,
    });
  }

  private description(raw: string): Description | null {
    const description = Description.create(raw);
    return description.isEmpty ? null : description;
  }
}

/**
 * DeletePositionCommandService logically deletes a position.
 */
@Injectable({ providedIn: 'root' })
export class DeletePositionCommandService {
  private readonly repository = inject(POSITION_REPOSITORY);

  async execute(command: DeletePositionCommand): Promise<void> {
    await this.repository.deletePosition(command.uuid);
  }
}

/**
 * UpdateRegimeCommandService modifies a regime.
 */
@Injectable({ providedIn: 'root' })
export class UpdateRegimeCommandService {
  private readonly repository = inject(REGIME_REPOSITORY);
  private readonly events = inject(DomainEventBus);

  async execute(command: UpdateRegimeCommand): Promise<Regime> {
    const name = CatalogName.create(command.name);
    const description = this.description(command.description);

    const regime = await this.repository.updateRegime({
      id: command.uuid,
      name,
      description,
      status: command.status,
    });
    this.events.publish({
      kind: REGIME_CHANGED,
      regimeId: regime.id,
      occurredOn: new Date(),
    });

    return regime;
  }

  private description(raw: string): Description | null {
    const description = Description.create(raw);
    return description.isEmpty ? null : description;
  }
}

/**
 * DeleteRegimeCommandService logically deletes a regime.
 */
@Injectable({ providedIn: 'root' })
export class DeleteRegimeCommandService {
  private readonly repository = inject(REGIME_REPOSITORY);
  private readonly events = inject(DomainEventBus);

  async execute(command: DeleteRegimeCommand): Promise<void> {
    await this.repository.deleteRegime(command.uuid);
    this.events.publish({
      kind: REGIME_CHANGED,
      regimeId: command.uuid,
      occurredOn: new Date(),
    });
  }
}

/**
 * UpdateWorkUnitCommandService modifies a work unit.
 *
 * The service is only sent when it changes, so the platform keeps the
 * current service and a work unit whose service was disabled later can still
 * be modified.
 */
@Injectable({ providedIn: 'root' })
export class UpdateWorkUnitCommandService {
  private readonly repository = inject(WORK_UNIT_REPOSITORY);

  async execute(command: UpdateWorkUnitCommand): Promise<WorkUnit> {
    const name = CatalogName.create(command.name);
    const description = this.description(command.description);
    const serviceId = command.serviceId?.trim();

    return this.repository.updateWorkUnit({
      id: command.uuid,
      name,
      description,
      ...(serviceId ? { serviceId } : {}),
      status: command.status,
    });
  }

  private description(raw: string): Description | null {
    const description = Description.create(raw);
    return description.isEmpty ? null : description;
  }
}

/**
 * DeleteWorkUnitCommandService logically deletes a work unit.
 */
@Injectable({ providedIn: 'root' })
export class DeleteWorkUnitCommandService {
  private readonly repository = inject(WORK_UNIT_REPOSITORY);

  async execute(command: DeleteWorkUnitCommand): Promise<void> {
    await this.repository.deleteWorkUnit(command.uuid);
  }
}
