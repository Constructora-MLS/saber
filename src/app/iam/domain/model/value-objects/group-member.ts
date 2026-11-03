import { Email, restoreEmail } from './email';
import { UserId } from './user-id';

/**
 * GroupMemberType is the kind of account that belongs to a role.
 *
 * The platform has one account that is not a member: the Owner of the
 * platform. It belongs to every role and it is not represented by one.
 */
export type GroupMemberType = 'owner' | 'member';

/** GroupMemberState is the state of a member as the platform published it. */
export interface GroupMemberState {
  /** The identifier of the account. */
  readonly id: UserId;
  /** The address of the account. */
  readonly email: Email;
  /** The first name of the account. */
  readonly firstName: string;
  /** The last name of the account. */
  readonly lastName: string;
  /** The kind of account. */
  readonly userType: GroupMemberType;
}

/**
 * GroupMember is an account that belongs to a role.
 *
 * The member is a value of the role, not an aggregate of its own: the
 * platform owns the membership and the accounts, so the frontend only
 * reads the link between them.
 */
export class GroupMember {
  private constructor(private readonly state: GroupMemberState) {}

  /** restore rebuilds a member from the state published by the platform. */
  static restore(state: GroupMemberState): GroupMember {
    return new GroupMember(state);
  }

  /** The identifier of the account. */
  get id(): UserId {
    return this.state.id;
  }

  /** The address of the account. */
  get email(): Email {
    return this.state.email;
  }

  /** The first name of the account. */
  get firstName(): string {
    return this.state.firstName;
  }

  /** The last name of the account. */
  get lastName(): string {
    return this.state.lastName;
  }

  /** The kind of account. */
  get userType(): GroupMemberType {
    return this.state.userType;
  }

  /** fullName is the name that the worker reads for the member. */
  get fullName(): string {
    const name = [this.firstName, this.lastName]
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .join(' ');
    return name || this.email;
  }
}
