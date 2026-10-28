// Package valueobjects holds the value objects of the Certificates bounded
// context.
// package valueobjects

/**
 * SNAPSHOT_FIELD is the vocabulary of the data that a certificate archives.
 *
 * The names are the ones that the platform publishes for the worker and the
 * assignment of the labour period.
 */
export const SNAPSHOT_FIELD = {
  employeeFirstName: 'employee.firstName',
  employeeLastName: 'employee.lastName',
  employeePaternalSurname: 'employee.paternalSurname',
  employeeMaternalSurname: 'employee.maternalSurname',
  employeeDni: 'employee.dni',
  assignmentPosition: 'assignment.position',
  assignmentService: 'assignment.service',
  assignmentWorkUnit: 'assignment.workUnit',
  assignmentWorkUnitCode: 'assignment.workUnitCode',
  assignmentStartDate: 'assignment.startDate',
  assignmentEndDate: 'assignment.endDate',
  issueDate: 'issueDate',
} as const;

/** CertificateSnapshot is the immutable data archived at issuance time. */
export interface CertificateSnapshot {
  readonly fields: Readonly<Record<string, string>>;
  readonly firstName: string;
  readonly lastName: string;
  readonly paternalSurname: string;
  readonly maternalSurname: string;
  readonly dni: string;
  readonly position: string;
  readonly service: string;
  readonly workUnit: string;
  readonly workUnitCode: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly issueDate: string;
  readonly fullName: string;
}

/** restoreCertificateSnapshot copies and freezes the archived field values. */
export function restoreCertificateSnapshot(values: ReadonlyMap<string, string>): CertificateSnapshot {
  const fields = Object.freeze(Object.fromEntries(values));
  const value = (field: string): string => fields[field] ?? '';
  const firstName = value(SNAPSHOT_FIELD.employeeFirstName);
  const lastName = value(SNAPSHOT_FIELD.employeeLastName);

  return Object.freeze({
    fields,
    firstName,
    lastName,
    paternalSurname: value(SNAPSHOT_FIELD.employeePaternalSurname),
    maternalSurname: value(SNAPSHOT_FIELD.employeeMaternalSurname),
    dni: value(SNAPSHOT_FIELD.employeeDni),
    position: value(SNAPSHOT_FIELD.assignmentPosition),
    service: value(SNAPSHOT_FIELD.assignmentService),
    workUnit: value(SNAPSHOT_FIELD.assignmentWorkUnit),
    workUnitCode: value(SNAPSHOT_FIELD.assignmentWorkUnitCode),
    startDate: value(SNAPSHOT_FIELD.assignmentStartDate),
    endDate: value(SNAPSHOT_FIELD.assignmentEndDate),
    issueDate: value(SNAPSHOT_FIELD.issueDate),
    fullName: `${firstName} ${lastName}`.trim(),
  });
}

/** hasSnapshotField reports whether a field existed in the archived data. */
export function hasSnapshotField(snapshot: CertificateSnapshot, field: string): boolean {
  return Object.hasOwn(snapshot.fields, field);
}
