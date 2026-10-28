// Package annulcertificatedialog asks for the reason of the annulment of a
// certificate.
//
// The annulment is the way of correcting a certificate that was issued by
// mistake: the history and the file of the issuance are kept and the
// certificate stops being in force.
// package annulcertificatedialog

import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ANNULMENT_REASON_MAX_LENGTH } from '../../../domain/model/value-objects/annulment-reason';
import { FieldCounter } from '../../../../shared/presentation/components/field-counter/field-counter';

/**
 * AnnulCertificateDialogData is the certificate that is annulled.
 */
export interface AnnulCertificateDialogData {
  /** The name of the worker, shown as the subject of the annulment. */
  readonly workerName: string;
}

/**
 * AnnulCertificateDialog asks for the reason of the annulment.
 *
 * The dialog asks only for the reason: the annulment is the annulment of
 * the certificate that the worker is looking at.
 */
@Component({
  imports: [
    FieldCounter,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  selector: 'app-annul-certificate-dialog',
  styleUrl: './annul-certificate-dialog.scss',
  templateUrl: './annul-certificate-dialog.html',
})
export class AnnulCertificateDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogRef =
    inject<MatDialogRef<AnnulCertificateDialog, string | undefined>>(MatDialogRef);

  /** The certificate that is annulled. */
  protected readonly data = inject<AnnulCertificateDialogData>(MAT_DIALOG_DATA);

  /** The limit of the reason of the annulment. */
  protected readonly reasonMaxLength = ANNULMENT_REASON_MAX_LENGTH;

  protected readonly form = this.formBuilder.nonNullable.group({
    reason: ['', [Validators.required, Validators.maxLength(ANNULMENT_REASON_MAX_LENGTH)]],
  });

  /**
   * cancel closes the dialog without annulling the certificate.
   */
  protected cancel(): void {
    this.dialogRef.close();
  }

  /**
   * submit answers with the reason of the annulment.
   */
  protected submit(): void {
    const reason = this.form.getRawValue().reason.trim();
    if (!reason) this.form.controls.reason.setErrors({ required: true });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(reason);
  }
}
