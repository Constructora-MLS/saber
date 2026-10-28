import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { describe, expect, it, vi } from 'vitest';
import { AnnulCertificateDialog } from './annul-certificate-dialog';

class Dialog extends AnnulCertificateDialog {
  submitReason(reason: string) {
    this.form.controls.reason.setValue(reason);
    this.submit();
  }
}

function setup() {
  const close = vi.fn();
  const injector = Injector.create({
    providers: [
      FormBuilder,
      { provide: MAT_DIALOG_DATA, useValue: { workerName: 'Ana López' } },
      { provide: MatDialogRef, useValue: { close } },
    ],
  });
  return { dialog: runInInjectionContext(injector, () => new Dialog()), close };
}

describe('motivo obligatorio para anular', () => {
  it('no permite confirmar un motivo vacío ni compuesto de espacios', () => {
    const { dialog, close } = setup();
    dialog.submitReason('');
    dialog.submitReason('   ');
    expect(close).not.toHaveBeenCalled();
  });

  it('envía el motivo a RR. HH. sin espacios sobrantes', () => {
    const { dialog, close } = setup();
    dialog.submitReason('  Datos laborales incorrectos  ');
    expect(close).toHaveBeenCalledExactlyOnceWith('Datos laborales incorrectos');
  });
});
