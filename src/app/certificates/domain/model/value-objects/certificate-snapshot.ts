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
  assignmentWorkUnit: 'assignment.workUnit',
  assignmentWorkUnitCode: 'assignment.workUnitCode',
  assignmentStartDate: 'assignment.startDate',
  assignmentEndDate: 'assignment.endDate',
  issueDate: 'issueDate',
} as const;

/**
 * CertificateSnapshot is the data of the worker and the assignment that a
 * certificate archives.
 *
 * The snapshot is a copy: the certificate keeps the data as it was on the
 * day of the issuance, even when the worker or the assignment change later.
 */
export class CertificateSnapshot {
  private constructor(private readonly values: ReadonlyMap<string, string>) {}

  /**
   * restore rebuilds the snapshot from the values of its fields.
   */
  static restore(values: ReadonlyMap<string, string>): CertificateSnapshot {
    return new CertificateSnapshot(values);
  }

  /**
   * values are the values of the fields of the snapshot.
   */
  get fields(): ReadonlyMap<string, string> {
    return this.values;
  }

  /** The first name of the worker, as the certificate writes it. */
  get firstName(): string {
    return this.value(SNAPSHOT_FIELD.employeeFirstName);
  }

  /** The last name of the worker, as the certificate writes it. */
  get lastName(): string {
    return this.value(SNAPSHOT_FIELD.employeeLastName);
  }

  /** The paternal surname of the worker, as the certificate writes it. */
  get paternalSurname(): string {
    return this.value(SNAPSHOT_FIELD.employeePaternalSurname);
  }

  /** The maternal surname of the worker, as the certificate writes it. */
  get maternalSurname(): string {
    return this.value(SNAPSHOT_FIELD.employeeMaternalSurname);
  }

  /** The identity document of the worker, as the certificate writes it. */
  get dni(): string {
    return this.value(SNAPSHOT_FIELD.employeeDni);
  }

  /** The position the worker performed. */
  get position(): string {
    return this.value(SNAPSHOT_FIELD.assignmentPosition);
  }

  /** The unit of work the worker was assigned to. */
  get workUnit(): string {
    return this.value(SNAPSHOT_FIELD.assignmentWorkUnit);
  }

  /** The code of the unit of work the worker was assigned to. */
  get workUnitCode(): string {
    return this.value(SNAPSHOT_FIELD.assignmentWorkUnitCode);
  }

  /** The date the labour period starts, in the YYYY-MM-DD format. */
  get startDate(): string {
    return this.value(SNAPSHOT_FIELD.assignmentStartDate);
  }

  /** The date the labour period was closed, in the YYYY-MM-DD format. */
  get endDate(): string {
    return this.value(SNAPSHOT_FIELD.assignmentEndDate);
  }

  /** The date the certificate was issued, in the YYYY-MM-DD format. */
  get issueDate(): string {
    return this.value(SNAPSHOT_FIELD.issueDate);
  }

  /**
   * fullName is the name of the worker as the certificate writes it.
   */
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  /**
   * value reads the value of a field.
   */
  private value(field: string): string {
    return this.values.get(field) ?? '';
  }
}
