// Package commands holds the commands of the Catalog bounded context.
//
// A command expresses an intention to change the state of the context. It
// carries only the intent and the values of the operation: the invariants are
// checked by the domain when the command is executed.
// package commands

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
