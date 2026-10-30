// Package contracts holds the REST contracts of the IAM bounded context.
//
// The types are the published shapes of the API: they are consumed as they
// arrive, without an intermediate representation.
// package contracts

/**
 * SignInRequestResource is the body of the sign in.
 */
export interface SignInRequestResource {
  /** The address of the user. */
  readonly email: string;
  /** The plain password of the user. */
  readonly password: string;
}

/**
 * UserResource is the public information of a user.
 */
export interface UserResource {
  /** The identifier of the user. */
  readonly uuid: string;
  /** The address of the user. */
  readonly email: string;
  /** The first name of the user. */
  readonly firstName: string;
  /** The last name of the user. */
  readonly lastName: string;
}

/**
 * TokenResponseResource is the answer of a successful authentication.
 *
 * The refresh token is not part of the answer: it travels in a cookie that
 * only the browser can read.
 */
export interface TokenResponseResource {
  /** The token that authenticates the private requests. */
  readonly accessToken: string;
  /** The way the access token travels: the Bearer header. */
  readonly tokenType: string;
  /** The lifetime of the access token, in seconds. */
  readonly expiresIn: number;
  /** The public information of the authenticated user. */
  readonly user: UserResource;
}
