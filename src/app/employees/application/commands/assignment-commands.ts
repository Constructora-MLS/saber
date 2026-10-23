// Package commands holds the commands of the Assignments bounded context.
//
// A command expresses an intention to change the state of the context. It
// carries only the intent and the values of the operation: the invariants are
// checked by the domain when the command is executed.
// package commands

/**
 * CreateAssignmentCommand asks for a new assignment.
 */
export interface CreateAssignmentCommand {
  /** The worker the assignment belongs to. */
  readonly employeeId: string;
  /** The unit of work the worker is assigned to. */
  readonly workUnitId: string;
  /** The position the worker performs. */
  readonly positionId: string;
  /** The date the labour period starts, in the YYYY-MM-DD format. */
  readonly startDate: string;
}

/**
 * CeaseAssignmentCommand asks for the end of the labour period of an
 * assignment.
 */
export interface CeaseAssignmentCommand {
  /** The identifier of the assignment. */
  readonly uuid: string;
  /** The date the labour period ends, in the YYYY-MM-DD format. */
  readonly date: string;
}

/**
 * DeleteAssignmentCommand asks for the logical deletion of an assignment.
 */
export interface DeleteAssignmentCommand {
  /** The identifier of the assignment. */
  readonly uuid: string;
}
