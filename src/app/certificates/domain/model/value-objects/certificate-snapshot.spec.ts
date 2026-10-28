import { describe, expect, it } from 'vitest';
import { hasSnapshotField, restoreCertificateSnapshot, SNAPSHOT_FIELD } from './certificate-snapshot';

describe('datos archivados del certificado', () => {
  it('publica el nombre del servicio que tenía la obra al emitirse', () => {
    const snapshot = restoreCertificateSnapshot(
      new Map<string, string>([[SNAPSHOT_FIELD.assignmentService, 'Ejecución de obras civiles']]),
    );

    expect(snapshot.service).toBe('Ejecución de obras civiles');
  });

  it('deja el servicio vacío cuando el certificado se emitió antes de archivarlo', () => {
    const snapshot = restoreCertificateSnapshot(new Map<string, string>());

    expect(snapshot.service).toBe('');
  });

  it('copia los valores para que cambios externos no alteren la instantánea', () => {
    const source = new Map<string, string>([[SNAPSHOT_FIELD.employeeFirstName, 'Ana']]);
    const snapshot = restoreCertificateSnapshot(source);
    source.set(SNAPSHOT_FIELD.employeeFirstName, 'Eva');
    expect(snapshot.firstName).toBe('Ana');
  });

  it('impide mutar los campos archivados', () => {
    const snapshot = restoreCertificateSnapshot(new Map([[SNAPSHOT_FIELD.employeeFirstName, 'Ana']]));
    expect(Object.isFrozen(snapshot.fields)).toBe(true);
    expect(hasSnapshotField(snapshot, SNAPSHOT_FIELD.employeeFirstName)).toBe(true);
    expect(hasSnapshotField(snapshot, SNAPSHOT_FIELD.employeeDni)).toBe(false);
    expect(snapshot.firstName).toBe('Ana');
  });

  it('no confunde el servicio con la unidad de trabajo', () => {
    const snapshot = restoreCertificateSnapshot(
      new Map<string, string>([
        [SNAPSHOT_FIELD.assignmentService, 'Ejecución de obras civiles'],
        [SNAPSHOT_FIELD.assignmentWorkUnit, 'Mejoramiento del puente La Molina'],
      ]),
    );

    expect(snapshot.service).toBe('Ejecución de obras civiles');
    expect(snapshot.workUnit).toBe('Mejoramiento del puente La Molina');
  });
});
