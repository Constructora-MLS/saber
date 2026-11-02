// Package commandservices holds the use cases of the IAM bounded context.
// package commandservices

import { inject, Injectable } from '@angular/core';
import { SignInCommand } from '../commands/iam-commands';
import { AuthSession } from '../session/auth-session';
import { Email } from '../../domain/model/value-objects/email';
import { Password } from '../../domain/model/value-objects/password';
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
