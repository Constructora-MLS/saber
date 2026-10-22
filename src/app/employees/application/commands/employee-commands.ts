// Package commands holds the commands of the Employees bounded context.
//
// A command expresses an intention to change the state of the context. It
// carries only the intent and the values of the operation: the invariants are
// checked by the domain when the command is executed.
// package commands

/**
 * CreateEmployeeCommand asks for a new worker.
 */
export interface CreateEmployeeCommand {
  /** The first name of the worker. */
  readonly firstName: string;
  /** The last name of the worker. */
  readonly lastName: string;
  /** The identity document of the worker. */
  readonly dni: string;
  /** The labor regime of the worker. */
  readonly regimeId: string;
  /** The date of birth of the worker, in the YYYY-MM-DD format. */
  readonly birthDate: string;
}

/**
 * UpdateEmployeeCommand asks for the modification of a worker.
 *
 * An absent field keeps the current value of the record. The identifier is
 * immutable, so it is not part of the changes.
 */
export interface UpdateEmployeeCommand {
  /** The identifier of the worker. */
  readonly uuid: string;
  /** The new first name of the worker. Absent when it does not change. */
  readonly firstName?: string;
  /** The new last name of the worker. Absent when it does not change. */
  readonly lastName?: string;
  /** The new identity document of the worker. Absent when it does not change. */
  readonly dni?: string;
  /** The new labor regime of the worker. Absent when it does not change. */
  readonly regimeId?: string;
  /** The new date of birth of the worker, in the YYYY-MM-DD format. Absent when it does not change. */
  readonly birthDate?: string;
}

/**
 * DeleteEmployeeCommand asks for the logical deletion of a worker.
 */
export interface DeleteEmployeeCommand {
  /** The identifier of the worker. */
  readonly uuid: string;
}
