// Package editassignmentdialog modifies an assignment of a worker.
// package editassignmentdialog

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { UpdateAssignmentCommand } from '../../../application/commands/assignment-commands';
import { todayAsAssignmentDate } from '../assignment-period/assignment-period.format';
import { AssignmentDialogWorker } from '../assignment-options';
import { CATALOG_REFERENCE_RESOLVER } from '../../../infrastructure/acl/catalog-reference.acl';
import {
  CatalogOption,
  CatalogSearchSelect,
} from '../../../../shared/presentation/components/catalog-search-select/catalog-search-select';

/** The assignment details that can be edited from its row. */
export interface EditableAssignment {
  readonly id: string;
  readonly workUnitId: string;
  readonly workUnitName: string;
  readonly workUnitCode: string | null;
  readonly workUnitService: string | null;
  readonly positionId: string;
  readonly positionName: string;
  readonly startDate: string;
  readonly endDate: string | null;
}

/** The context of the assignment edit dialog. */
export interface EditAssignmentDialogData {
  readonly worker: AssignmentDialogWorker;
  readonly assignment: EditableAssignment;
}

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
  selector: 'app-edit-assignment-dialog',
  styleUrl: './edit-assignment-dialog.scss',
  templateUrl: './edit-assignment-dialog.html',
})
export class EditAssignmentDialog {
  private readonly formBuilder = inject(FormBuilder);
  private readonly catalog = inject(CATALOG_REFERENCE_RESOLVER);
  private readonly dialogRef =
    inject<MatDialogRef<EditAssignmentDialog, UpdateAssignmentCommand | undefined>>(MatDialogRef);

  protected readonly data = inject<EditAssignmentDialogData>(MAT_DIALOG_DATA);
  protected readonly today = todayAsAssignmentDate();
  protected readonly maxStartDate =
    this.data.assignment.endDate && this.data.assignment.endDate < this.today
      ? this.data.assignment.endDate
      : this.today;

  /**
   * The unit of work of the assignment.
   *
   * It is always offered, even when it is not available any more: a form
   * that modifies a record never loses the value of the record.
   */
  private readonly currentWorkUnit: CatalogOption = {
    id: this.data.assignment.workUnitId,
    label: `${this.data.assignment.workUnitCode ?? '—'} · ${this.data.assignment.workUnitName}`,
    ...(this.data.assignment.workUnitService
      ? { detail: this.data.assignment.workUnitService }
      : {}),
    current: true,
  };

  /**
   * The position of the assignment. It is always offered, for the same
   * reason as the unit of work.
   */
  private readonly currentPosition: CatalogOption = {
    id: this.data.assignment.positionId,
    label: this.data.assignment.positionName,
    current: true,
  };

  protected readonly form = this.formBuilder.nonNullable.group({
    workUnitId: [this.data.assignment.workUnitId, [Validators.required]],
    positionId: [this.data.assignment.positionId, [Validators.required]],
    startDate: [this.data.assignment.startDate, [Validators.required]],
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

  protected hasChanges(): boolean {
    const current = this.form.getRawValue();
    return (
      current.workUnitId !== this.data.assignment.workUnitId ||
      current.positionId !== this.data.assignment.positionId ||
      current.startDate !== this.data.assignment.startDate
    );
  }

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
        this.withCurrent(
          units.map((unit) => ({
            id: unit.id,
            label: `${unit.code} · ${unit.name}`,
            detail: unit.serviceName,
          })),
          this.currentWorkUnit,
        ),
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
      this.positions.set(
        this.withCurrent(
          positions.map((position) => ({ id: position.id, label: position.name })),
          this.currentPosition,
        ),
      );
    } catch {
      this.positionsError.set('No se pudieron leer los cargos.');
    } finally {
      this.loadingPositions.set(false);
    }
  }

  /**
   * withCurrent keeps the record of the assignment in the options.
   *
   * The record may not be available any more, so it is always offered: a
   * form that modifies a record never loses its value.
   */
  private withCurrent(
    options: readonly CatalogOption[],
    current: CatalogOption,
  ): readonly CatalogOption[] {
    return options.some((option) => option.id === current.id) ? options : [current, ...options];
  }

  protected submit(): void {
    if (this.form.invalid || !this.hasChanges()) {
      this.form.markAllAsTouched();
      return;
    }

    const current = this.form.getRawValue();
    this.dialogRef.close({
      uuid: this.data.assignment.id,
      ...(current.workUnitId !== this.data.assignment.workUnitId
        ? { workUnitId: current.workUnitId }
        : {}),
      ...(current.positionId !== this.data.assignment.positionId
        ? { positionId: current.positionId }
        : {}),
      ...(current.startDate !== this.data.assignment.startDate
        ? { startDate: current.startDate }
        : {}),
    });
  }
}
