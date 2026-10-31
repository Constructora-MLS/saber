// Package commands holds the commands of the IAM bounded context.
//
// A command expresses an intention to change the state of the context.
// package commands

/**
 * InviteUserCommand asks for an invitation of a member of the platform.
 *
 * The address is the only thing the inviter decides: the invited member
 * chooses its names and its password when it accepts the invitation.
 */
export interface InviteUserCommand {
  /** The address that receives the invitation. */
  readonly email: string;
}

/**
 * DisableUserCommand asks for the logical deletion of an account.
 */
export interface DisableUserCommand {
  /** The identifier of the account. */
  readonly id: string;
}

/**
 * InvitationCreated is the outcome of a successful invitation.
 *
 * The credential of the invitation never travels to the browser: it only
 * reaches the invited member through the email.
 */
export interface InvitationCreated {
  /** The address that received the invitation. */
  readonly email: string;
  /** The lifetime of the invitation, in seconds. */
  readonly expiresIn: number;
}
