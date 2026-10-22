// Package valueobjects holds the value objects of the Employees bounded
// context.
// package valueobjects

/**
 * EmployeeStatus is the lifecycle state of an employee.
 */
export type EmployeeStatus = 'VIGENTE' | 'RETIRADO' | 'DELETED';

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
    case 'DELETED':
      return 'Eliminado';
  }
}
