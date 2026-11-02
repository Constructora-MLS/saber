// Package commandservices holds the use cases of the IAM bounded context.
// package commandservices

import { inject, Injectable } from '@angular/core';
import {
  ForgotPasswordCommand,
  ResetPasswordCommand,
  SignInCommand,
} from '../commands/iam-commands';
import { AuthSession } from '../session/auth-session';
import { Email } from '../../domain/model/value-objects/email';
import { Password, parseAccountPassword } from '../../domain/model/value-objects/password';
import { RecoveryToken } from '../../domain/model/value-objects/recovery-token';
import { AuthGateway } from '../../infrastructure/gateways/auth.gateway';

/**
 * SignInCommandService authenticates a user and opens a session.
 *
 * The credentials are validated before they leave the browser, so an obvious
 * mistake never reaches the platform.
 */
@Injectable({ providedIn: 'root' })
export class SignInCommandService {
  private readonly gateway = inject(AuthGateway);

  async execute(command: SignInCommand): Promise<AuthSession> {
    const email = Email.create(command.email);
    const password = Password.create(command.password);

    return this.gateway.signIn(email, password);
  }
}

/**
 * ForgotPasswordCommandService asks for a link that recovers the password.
 *
 * The address is validated before it leaves the browser, so an obvious
 * mistake never reaches the platform.
 *
 * The failure of the platform is not swallowed: the presentation decides
 * what it shows, and the answer of the platform says nothing about the
 * account, so the message is always the same one.
 */
@Injectable({ providedIn: 'root' })
export class ForgotPasswordCommandService {
  private readonly gateway = inject(AuthGateway);

  async execute(command: ForgotPasswordCommand): Promise<void> {
    const email = Email.create(command.email);

    await this.gateway.forgotPassword(email);
  }
}

/**
 * ResetPasswordCommandService changes the password of an account with the
 * credential of a recovery link.
 *
 * The credential and the password are validated before they leave the
 * browser, so an obvious mistake never reaches the platform.
 */
@Injectable({ providedIn: 'root' })
export class ResetPasswordCommandService {
  private readonly gateway = inject(AuthGateway);

  async execute(command: ResetPasswordCommand): Promise<void> {
    const token = RecoveryToken.create(command.token);
    const password = parseAccountPassword(command.password);

    await this.gateway.resetPassword(token, password);
  }
}
