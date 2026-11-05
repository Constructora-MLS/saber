/** The lifecycle state of a group as published by the backend. */
export type GroupStatusResource = 'active' | 'deleted';

/** The seven permission flags stored on a group. */
export interface GroupPermissionsResource {
  readonly manageEmployees: boolean;
  readonly manageAssignments: boolean;
  readonly manageCatalog: boolean;
  readonly manageCertificates: boolean;
  readonly manageUsers: boolean;
  readonly managePermissionsGroups: boolean;
  readonly administrator: boolean;
}

/** The REST representation of a group. */
export interface GroupResource {
  readonly uuid: string;
  readonly name: string;
  readonly color: string;
  readonly priority: number;
  readonly permissions: GroupPermissionsResource;
  readonly status: GroupStatusResource;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** The body accepted when a group is registered. */
export interface CreateGroupRequestResource {
  readonly name: string;
  readonly color: string;
}

/** A page of groups returned by the REST API. */
export interface GroupPageResource {
  readonly items: readonly GroupResource[];
  readonly page: number;
  readonly totalPages: number;
  readonly total: number;
}

/** The flat, partial PATCH body accepted by the backend. */
export interface UpdateGroupRequestResource {
  readonly name?: string;
  readonly color?: string;
  readonly manageEmployees?: boolean;
  readonly manageAssignments?: boolean;
  readonly manageCatalog?: boolean;
  readonly manageCertificates?: boolean;
  readonly manageUsers?: boolean;
  readonly managePermissionsGroups?: boolean;
  readonly administrator?: boolean;
}

/** The complete hierarchy ordered from highest to lowest priority. */
export interface GroupOrderRequestResource {
  readonly groupIds: readonly string[];
}

/** The kind of account that belongs to a role. */
export type GroupMemberTypeResource = 'owner' | 'member';

/** The representation of an account that belongs to a role. */
export interface GroupMemberResource {
  readonly uuid: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly userType: GroupMemberTypeResource;
}

/** A page of the accounts that belong to a role. */
export interface GroupMemberPageResource {
  readonly items: readonly GroupMemberResource[];
  readonly page: number;
  readonly totalPages: number;
  readonly total: number;
}
