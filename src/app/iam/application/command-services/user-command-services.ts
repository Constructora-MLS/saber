// Package commandservices holds the use cases of the IAM bounded context.
// package commandservices

import { inject, Injectable } from '@angular/core';
import {
  AcceptInvitationCommand,
  DeleteUserCommand,
  InvitationCreated,
  InviteUserCommand,
  UpdateProfileCommand,
} from '../commands/user-commands';
import { PlatformUser } from '../../domain/model/aggregates/platform-user';
import { Email } from '../../domain/model/value-objects/email';
import { parseAccountPassword } from '../../domain/model/value-objects/password';
import { parsePersonName } from '../../domain/model/value-objects/person-name';
import { UserId } from '../../domain/model/value-objects/user-id';
import { UserGateway } from '../../infrastructure/gateways/user.gateway';

/**
 * InviteUserCommandService invites a member of the platform.
 *
 * The address is validated before it leaves the browser, so an obvious
 * mistake never reaches the platform.
 */
@Injectable({ providedIn: 'root' })
export class InviteUserCommandService {
  private readonly gateway = inject(UserGateway);

  async execute(command: InviteUserCommand): Promise<InvitationCreated> {
    const email = Email.create(command.email);

    return this.gateway.inviteUser(email);
  }
}

/**
 * DeleteUserCommandService removes the access of an account of the platform.
 *
 * The account is logically deleted and its sessions are closed, so it never
 * reaches the platform again.
 */
@Injectable({ providedIn: 'root' })
export class DeleteUserCommandService {
  private readonly gateway = inject(UserGateway);

  async execute(command: DeleteUserCommand): Promise<void> {
    const id = UserId.create(command.id);

    await this.gateway.deleteUser(id);
  }
}

/**
 * UpdateProfileCommandService changes the names of the authenticated user.
 *
 * The names are validated before they leave the browser, so an obvious
 * mistake never reaches the platform.
 */
@Injectable({ providedIn: 'root' })
export class UpdateProfileCommandService {
  private readonly gateway = inject(UserGateway);

  async execute(command: UpdateProfileCommand): Promise<PlatformUser> {
    const firstName = parsePersonName(command.firstName, 'firstName');
    const lastName = parsePersonName(command.lastName, 'lastName');

    return this.gateway.updateProfile({ firstName, lastName });
  }
}

/**
 * AcceptInvitationCommandService activates the account of an invitation.
 *
 * The names and the password are validated before they leave the browser,
 * so an obvious mistake never reaches the platform.
 */
@Injectable({ providedIn: 'root' })
export class AcceptInvitationCommandService {
  private readonly gateway = inject(UserGateway);

  async execute(command: AcceptInvitationCommand): Promise<PlatformUser> {
    const firstName = parsePersonName(command.firstName);
    const lastName = parsePersonName(command.lastName);
    const password = parseAccountPassword(command.password);

    return this.gateway.acceptInvitation(command.token, {
      firstName,
      lastName,
      password,
    });
  }
}
