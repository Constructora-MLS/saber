import { Group } from '../../domain/model/aggregates/group';

/** GroupPage is a paginated listing of the active hierarchy. */
export interface GroupPage<T> {
  /** The groups on the requested page. */
  readonly items: readonly T[];
  /** The requested page, starting at one. */
  readonly page: number;
  /** The number of pages in the listing. */
  readonly totalPages: number;
  /** The number of active groups in the listing. */
  readonly total: number;
}

/** GroupCriteria are the pagination values used to read the hierarchy. */
export interface GroupCriteria {
  /** A case-insensitive substring matched against the group name. */
  readonly search?: string;
  /** The maximum number of groups returned in one page. */
  readonly limit?: number;
  /** The requested page, starting at one. */
  readonly page?: number;
}

/** ListGroupsQuery asks for one page of the active hierarchy. */
export interface ListGroupsQuery {
  /** A case-insensitive substring matched against the group name. */
  readonly search?: string;
  /** The maximum number of groups returned in one page. */
  readonly limit?: number;
  /** The requested page, starting at one. */
  readonly page?: number;
}

/** GetGroupQuery asks for the persisted details of one group. */
export interface GetGroupQuery {
  /** The identifier returned by the platform. */
  readonly uuid: string;
}

/** A page of groups restored from the external API. */
export type GroupsPage = GroupPage<Group>;
