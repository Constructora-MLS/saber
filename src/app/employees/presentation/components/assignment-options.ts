// Package assignmentoptions holds the presentation types that the dialogs of
// the assignments share.
//
// The types describe what the screens show and what they ask for. They carry
// no rule of the domain: the rules live in the aggregates of the context,
// and the screens only announce their intentions.
// package assignmentoptions

/**
 * AssignmentDialogWorker is the worker that a dialog of an assignment shows
 * as the context of the operation.
 *
 * The dialog does not know the model of the worker: it knows the name and
 * the document that identify it, and the state that is shown next to them.
 */
export interface AssignmentDialogWorker {
  /** The full name of the worker. */
  readonly name: string;
  /** The name of the document that identifies the worker. */
  readonly documentLabel: string;
  /** The value of the document that identifies the worker. */
  readonly documentValue: string;
  /** The state of the worker, in the language of the interfaces. */
  readonly statusLabel: string;
}
