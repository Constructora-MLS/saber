// Package valueobjects holds the value objects of the Employees bounded
// context.
// package valueobjects

/**
 * EmployeeStatus is the labour status of a worker.
 *
 * The labour status is derived from the assignments of the worker: it is
 * never edited by hand and it never travels in a request. A worker that
 * holds no assignment is vigente by default, because it was just
 * registered.
 *
 * The logical deletion of a record is not a labour status: a deleted worker
 * is never published, so the state never reaches the interfaces.
 */
export type EmployeeStatus = 'VIGENTE' | 'RETIRADO';

/**
 * FilterableEmployeeStatus is the state an employee can be filtered by.
 *
 * The logically deleted employees are never listed, so they are not a filter
 * the platform accepts.
 */
export type FilterableEmployeeStatus = 'VIGENTE' | 'RETIRADO';

/**
 * The states an employee can be filtered by.
 *
 * The logically deleted employees are never listed.
 */
export const FILTERABLE_EMPLOYEE_STATUSES: readonly FilterableEmployeeStatus[] = [
  'VIGENTE',
  'RETIRADO',
];

/**
 * employeeStatusLabel returns the label of a state in the language of the
 * interfaces.
 */
export function employeeStatusLabel(status: EmployeeStatus): string {
  switch (status) {
    case 'VIGENTE':
      return 'Vigente';
    case 'RETIRADO':
      return 'Retirado';
  }
}
