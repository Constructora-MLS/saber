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

/**
 * ForgotPasswordCommand asks for a link that recovers the password of an
 * account.
 *
 * The answer of the platform is the same for every address, so the command
 * never asks whether the account exists.
 */
export interface ForgotPasswordCommand {
  /** The address of the account that recovers the password. */
  readonly email: string;
}

/**
 * ResetPasswordCommand asks for a new password of an account.
 *
 * The confirmation of the password never travels: the platform accepts one
 * password and the form is the one that compares the two.
 */
export interface ResetPasswordCommand {
  /** The credential of the link of recovery. */
  readonly token: string;
  /** The new password of the account. */
  readonly password: string;
}
