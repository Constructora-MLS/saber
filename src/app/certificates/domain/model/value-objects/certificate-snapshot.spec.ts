import { describe, expect, it } from 'vitest';
import { CertificateSnapshot, SNAPSHOT_FIELD } from './certificate-snapshot';

describe('datos archivados del certificado', () => {
  it('publica el nombre del servicio que tenía la obra al emitirse', () => {
    const snapshot = CertificateSnapshot.restore(
      new Map<string, string>([[SNAPSHOT_FIELD.assignmentService, 'Ejecución de obras civiles']]),
    );

    expect(snapshot.service).toBe('Ejecución de obras civiles');
  });

  it('deja el servicio vacío cuando el certificado se emitió antes de archivarlo', () => {
    const snapshot = CertificateSnapshot.restore(new Map<string, string>());

    expect(snapshot.service).toBe('');
  });

  it('no confunde el servicio con la unidad de trabajo', () => {
    const snapshot = CertificateSnapshot.restore(
      new Map<string, string>([
        [SNAPSHOT_FIELD.assignmentService, 'Ejecución de obras civiles'],
        [SNAPSHOT_FIELD.assignmentWorkUnit, 'Mejoramiento del puente La Molina'],
      ]),
    );

    expect(snapshot.service).toBe('Ejecución de obras civiles');
    expect(snapshot.workUnit).toBe('Mejoramiento del puente La Molina');
  });
});
