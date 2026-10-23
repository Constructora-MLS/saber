// Package valueobjects holds the value objects of the Assignments bounded
// context.
// package valueobjects

/**
 * AssignmentStatus is the labour status of an assignment.
 *
 * The labour status tells whether the labour period of the assignment is
 * open. It is derived from the period: the cessation is the only way to
 * close it.
 *
 * The logical deletion of a record is not a labour status: a deleted
 * assignment has no labour period at all, and it is never published.
 */
export type AssignmentStatus = 'VIGENTE' | 'RETIRADO';

/**
 * FilterableAssignmentStatus is the state an assignment can be filtered by.
 *
 * The logically deleted assignments are never listed, so they are not a
 * filter the platform accepts.
 */
export type FilterableAssignmentStatus = 'VIGENTE' | 'RETIRADO';

/**
 * The states an assignment can be filtered by.
 *
 * The logically deleted assignments are never listed.
 */
export const FILTERABLE_ASSIGNMENT_STATUSES: readonly FilterableAssignmentStatus[] = [
  'VIGENTE',
  'RETIRADO',
];

/**
 * assignmentStatusLabel returns the label of a state in the language of the
 * interfaces.
 */
export function assignmentStatusLabel(status: AssignmentStatus): string {
  switch (status) {
    case 'VIGENTE':
      return 'Vigente';
    case 'RETIRADO':
      return 'Retirado';
  }
}
