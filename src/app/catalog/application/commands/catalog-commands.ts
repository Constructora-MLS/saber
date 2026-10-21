// Package commands holds the commands of the Catalog bounded context.
//
// A command expresses an intention to change the state of the context. It
// carries only the intent and the values of the operation: the invariants are
// checked by the domain when the command is executed.
// package commands

import { UpdatableCatalogStatus } from '../../domain/model/value-objects/catalog-status';

/**
 * CreateServiceCommand asks for a new service.
 */
export interface CreateServiceCommand {
  /** The name of the service. */
  readonly name: string;
  /** The optional description of the service. */
  readonly description?: string | null;
}

/**
 * CreatePositionCommand asks for a new position.
 */
export interface CreatePositionCommand {
  /** The name of the position. */
  readonly name: string;
  /** The optional description of the position. */
  readonly description?: string | null;
}

/**
 * CreateRegimeCommand asks for a new regime.
 */
export interface CreateRegimeCommand {
  /** The name of the regime. */
  readonly name: string;
  /** The optional description of the regime. */
  readonly description?: string | null;
}

/**
 * CreateWorkUnitCommand asks for a new work unit.
 */
export interface CreateWorkUnitCommand {
  /** The code of the work unit. */
  readonly code: string;
  /** The name of the work unit. */
  readonly name: string;
  /** The optional description of the work unit. */
  readonly description?: string | null;
  /** The service the work unit belongs to. */
  readonly serviceId: string;
}

/**
 * UpdateServiceCommand asks for the modification of a service.
 *
 * The command carries the whole set of the editable fields: the platform
 * applies the changes to the record and keeps the fields that the command
 * does not carry.
 */
export interface UpdateServiceCommand {
  /** The identifier of the service. */
  readonly uuid: string;
  /** The new name of the service. */
  readonly name: string;
  /** The new description of the service. An empty text removes it. */
  readonly description: string;
  /** The new state of the service. */
  readonly status: UpdatableCatalogStatus;
}

/**
 * DeleteServiceCommand asks for the logical deletion of a service.
 */
export interface DeleteServiceCommand {
  /** The identifier of the service. */
  readonly uuid: string;
}

/**
 * UpdatePositionCommand asks for the modification of a position.
 */
export interface UpdatePositionCommand {
  /** The identifier of the position. */
  readonly uuid: string;
  /** The new name of the position. */
  readonly name: string;
  /** The new description of the position. An empty text removes it. */
  readonly description: string;
  /** The new state of the position. */
  readonly status: UpdatableCatalogStatus;
}

/**
 * DeletePositionCommand asks for the logical deletion of a position.
 */
export interface DeletePositionCommand {
  /** The identifier of the position. */
  readonly uuid: string;
}

/**
 * UpdateRegimeCommand asks for the modification of a regime.
 */
export interface UpdateRegimeCommand {
  /** The identifier of the regime. */
  readonly uuid: string;
  /** The new name of the regime. */
  readonly name: string;
  /** The new description of the regime. An empty text removes it. */
  readonly description: string;
  /** The new state of the regime. */
  readonly status: UpdatableCatalogStatus;
}

/**
 * DeleteRegimeCommand asks for the logical deletion of a regime.
 */
export interface DeleteRegimeCommand {
  /** The identifier of the regime. */
  readonly uuid: string;
}

/**
 * UpdateWorkUnitCommand asks for the modification of a work unit.
 */
export interface UpdateWorkUnitCommand {
  /** The identifier of the work unit. */
  readonly uuid: string;
  /** The new code of the work unit. */
  readonly code: string;
  /** The new name of the work unit. */
  readonly name: string;
  /** The new description of the work unit. An empty text removes it. */
  readonly description: string;
  /** The new service of the work unit. */
  readonly serviceId: string;
  /** The new state of the work unit. */
  readonly status: UpdatableCatalogStatus;
}

/**
 * DeleteWorkUnitCommand asks for the logical deletion of a work unit.
 */
export interface DeleteWorkUnitCommand {
  /** The identifier of the work unit. */
  readonly uuid: string;
}
