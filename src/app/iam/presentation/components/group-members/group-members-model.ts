import { GroupMemberRow } from './group-members';

/**
 * filterGroupMembers keeps the members whose name or address match the
 * term.
 *
 * The platform publishes the members of a role without a search, so the
 * term filters the members that the page already read. The comparison
 * ignores the case and the spaces around the term.
 */
export function filterGroupMembers(
  members: readonly GroupMemberRow[],
  term: string,
): readonly GroupMemberRow[] {
  const normalized = term.trim().toLowerCase();
  if (normalized.length === 0) {
    return members;
  }
  return members.filter(
    (member) =>
      member.name.toLowerCase().includes(normalized) ||
      member.email.toLowerCase().includes(normalized),
  );
}
