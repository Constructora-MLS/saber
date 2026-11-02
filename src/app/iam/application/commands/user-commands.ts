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
 * DeleteUserCommand asks for the logical deletion of an account.
 */
export interface DeleteUserCommand {
  /** The identifier of the account. */
  readonly id: string;
}

/**
 * AcceptInvitationCommand asks for the activation of an invited account.
 *
 * The address is not part of the command: the invitation already carries it
 * and the platform never lets the invited member change it.
 */
export interface AcceptInvitationCommand {
  /** The credential of the invitation. */
  readonly token: string;
  /** The first name of the invited member. */
  readonly firstName: string;
  /** The last name of the invited member. */
  readonly lastName: string;
  /** The password that the invited member chooses. */
  readonly password: string;
}

/**
 * UpdateProfileCommand asks for the edition of the names of the account of
 * the user.
 *
 * The identifier of the account never travels in the command: the platform
 * takes it from the access token of the session.
 */
export interface UpdateProfileCommand {
  /** The first name of the user. */
  readonly firstName: string;
  /** The last name of the user. */
  readonly lastName: string;
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
