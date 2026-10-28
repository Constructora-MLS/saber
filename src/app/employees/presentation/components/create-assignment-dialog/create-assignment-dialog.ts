// Package createassignmentdialog registers an assignment of a worker.
// package createassignmentdialog

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AssignmentDialogWorker } from '../assignment-options';
import { todayAsAssignmentDate } from '../assignment-period/assignment-period.format';
import { CreateAssignmentCommand } from '../../../application/commands/assignment-commands';
import { CATALOG_REFERENCE_RESOLVER } from '../../../infrastructure/acl/catalog-reference.acl';
import {
  CatalogOption,
  CatalogSearchSelect,
} from '../../../../shared/presentation/components/catalog-search-select/catalog-search-select';

/**
 * CreateAssignmentDialogData is the context of the registration.
 *
 * The dialog never reads the catalogs by itself: the page gives it the
 * worker that the assignment belongs to, and the dialog looks for the
 * records that the worker can pick.
 */
export interface CreateAssignmentDialogData {
  /** The worker the assignment belongs to. */
  readonly worker: AssignmentDialogWorker;
}

/**
 * CreateAssignmentDialog registers an assignment of a worker.
 *
 * The dialog only asks for what the context needs to register an
 * assignment: the unit of work, the position and the date the labour
 * period starts.
 */
@Component({
  imports: [
    CatalogSearchSelect,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  selector: 'app-create-assignment-dialog',
  styleUrl: './create-assignment-dialog.scss',
  templateUrl: './create-assignment-dialog.html',
})
export class CreateAssignmentDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly catalog = inject(CATALOG_REFERENCE_RESOLVER);
  private readonly dialogRef =
    inject<MatDialogRef<CreateAssignmentDialog, CreateAssignmentCommand | undefined>>(MatDialogRef);

  /** The context of the registration. */
  protected readonly data = inject<CreateAssignmentDialogData>(MAT_DIALOG_DATA);

  /** The last day that the platform accepts as the start of a period. */
  protected readonly today = todayAsAssignmentDate();

  protected readonly form = this.formBuilder.nonNullable.group({
    workUnitId: ['', [Validators.required]],
    positionId: ['', [Validators.required]],
    startDate: [this.today, [Validators.required]],
  });

  /** The units of work that the selector offers. */
  protected readonly workUnits = signal<readonly CatalogOption[]>([]);
  /** The positions that the selector offers. */
  protected readonly positions = signal<readonly CatalogOption[]>([]);
  /** Whether the units of work are being read. */
  protected readonly loadingWorkUnits = signal(false);
  /** Whether the positions are being read. */
  protected readonly loadingPositions = signal(false);
  /** The failure that prevented the reading of the units of work. */
  protected readonly workUnitsError = signal<string | null>(null);
  /** The failure that prevented the reading of the positions. */
  protected readonly positionsError = signal<string | null>(null);

  constructor() {
    void this.searchWorkUnits('');
    void this.searchPositions('');
  }

  /**
   * cancel closes the dialog without registering the assignment.
   */
  protected cancel(): void {
    this.dialogRef.close();
  }

  /**
   * searchWorkUnits reads the available units of work that match the term.
   */
  protected async searchWorkUnits(term: string): Promise<void> {
    this.loadingWorkUnits.set(true);
    this.workUnitsError.set(null);
    try {
      const units = await this.catalog.listWorkUnits(term);
      this.workUnits.set(
        units.map((unit) => ({
          id: unit.id,
          label: `${unit.code} · ${unit.name}`,
          detail: unit.serviceName,
        })),
      );
    } catch {
      this.workUnitsError.set('No se pudieron leer las unidades de trabajo.');
    } finally {
      this.loadingWorkUnits.set(false);
    }
  }

  /**
   * searchPositions reads the available positions that match the term.
   */
  protected async searchPositions(term: string): Promise<void> {
    this.loadingPositions.set(true);
    this.positionsError.set(null);
    try {
      const positions = await this.catalog.listPositions(term);
      this.positions.set(positions.map((position) => ({ id: position.id, label: position.name })));
    } catch {
      this.positionsError.set('No se pudieron leer los cargos.');
    } finally {
      this.loadingPositions.set(false);
    }
  }

  /**
   * submit answers with the assignment that the worker asked to register.
   */
  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    this.dialogRef.close({
      employeeId: '',
      workUnitId: raw.workUnitId,
      positionId: raw.positionId,
      startDate: raw.startDate,
    });
  }
}
