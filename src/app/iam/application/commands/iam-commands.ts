// Package commands holds the commands of the IAM bounded context.
//
// A command expresses an intention to change the state of the context. It
// carries only the intent and the values of the operation: the invariants are
// checked by the domain when the command is executed.
// package commands

/**
 * SignInCommand asks for a session of the platform.
 *
 * The credentials are the plain values of the form: the hash of the password
 * never travels to the browser.
 */
export interface SignInCommand {
  /** The address of the user. */
  readonly email: string;
  /** The plain password of the user. */
  readonly password: string;
}
