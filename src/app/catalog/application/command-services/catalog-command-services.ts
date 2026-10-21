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
} from '../commands/catalog-commands';
import { CatalogName } from '../../domain/model/value-objects/catalog-name';
import { Description } from '../../domain/model/value-objects/description';
import { UnitCode } from '../../domain/model/value-objects/unit-code';
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

  async execute(command: CreateRegimeCommand): Promise<Regime> {
    const name = CatalogName.create(command.name);
    const description = this.description(command.description);

    return this.repository.createRegime({ name, description });
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
    const code = UnitCode.create(command.code);
    const name = CatalogName.create(command.name);
    const serviceId = command.serviceId.trim();
    if (serviceId.length === 0) {
      throw new Error('La unidad de trabajo pertenece a un servicio.');
    }
    const description = this.description(command.description);

    return this.repository.createWorkUnit({ code, name, description, serviceId });
  }

  private description(raw: string | null | undefined): Description | null {
    if (raw === null || raw === undefined || raw.trim().length === 0) {
      return null;
    }
    const description = Description.create(raw);
    return description.isEmpty ? null : description;
  }
}
