// Package commandservices holds the use cases of the IAM bounded context.
// package commandservices

import { inject, Injectable } from '@angular/core';
import {
  DisableUserCommand,
  InvitationCreated,
  InviteUserCommand,
} from '../commands/user-commands';
import { Email } from '../../domain/model/value-objects/email';
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
 * DisableUserCommandService disables an account of the platform.
 *
 * The account is logically deleted and its sessions are closed, so it never
 * reaches the platform again.
 */
@Injectable({ providedIn: 'root' })
export class DisableUserCommandService {
  private readonly gateway = inject(UserGateway);

  async execute(command: DisableUserCommand): Promise<void> {
    const id = UserId.create(command.id);

    await this.gateway.disableUser(id);
  }
}
