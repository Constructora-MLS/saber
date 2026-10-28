import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import {
  DeletePositionCommandService,
  DeleteRegimeCommandService,
  DeleteServiceCommandService,
  DeleteWorkUnitCommandService,
} from '../../../application/command-services/catalog-command-services';
import { CatalogValidationError } from '../../../domain/model/errors/catalog-errors';
import { catalogApiErrorMessage } from '../../catalog-error-messages';

/**
 * DeletableCatalogRecord is the record that a worker of the application asks
 * to delete.
 */
export interface DeletableCatalogRecord {
  /** The kind of the record. */
  readonly kind: 'service' | 'position' | 'regime' | 'work-unit';
  /** The identifier of the record. */
  readonly id: string;
  /** The name of the record. */
  readonly name: string;
}

/**
 * DeleteCatalogRecordDialog logically deletes a record of the catalog.
 *
 * The deletion is permanent for the worker of the application: the record
 * leaves the catalog and it is not listed again.
 */
@Component({
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  selector: 'app-delete-catalog-record-dialog',
  styleUrl: './delete-catalog-record-dialog.scss',
  templateUrl: './delete-catalog-record-dialog.html',
})
export class DeleteCatalogRecordDialog {
  private readonly deleteService = inject(DeleteServiceCommandService);
  private readonly deletePosition = inject(DeletePositionCommandService);
  private readonly deleteRegime = inject(DeleteRegimeCommandService);
  private readonly deleteWorkUnit = inject(DeleteWorkUnitCommandService);
  private readonly dialogRef =
    inject<MatDialogRef<DeleteCatalogRecordDialog, boolean>>(MatDialogRef);

  /** The record that is being deleted. */
  protected readonly data = inject<DeletableCatalogRecord>(MAT_DIALOG_DATA);

  protected readonly deleting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * label returns the name of the record in the language of the interfaces.
   */
  protected label(): string {
    switch (this.data.kind) {
      case 'service':
        return 'el servicio';
      case 'position':
        return 'el cargo';
      case 'regime':
        return 'el régimen';
      case 'work-unit':
        return 'la unidad de trabajo';
    }
  }

  /**
   * cancel closes the dialog without deleting the record.
   */
  protected cancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * confirm deletes the record.
   */
  protected async confirm(): Promise<void> {
    if (this.deleting()) {
      return;
    }

    this.deleting.set(true);
    this.errorMessage.set(null);

    try {
      await this.apply();
      this.dialogRef.close(true);
    } catch (error) {
      this.errorMessage.set(this.describe(error));
    } finally {
      this.deleting.set(false);
    }
  }

  /**
   * apply sends the deletion to the use case of the record.
   */
  private async apply(): Promise<void> {
    const data = this.data;

    if (data.kind === 'service') {
      await this.deleteService.execute({ uuid: data.id });
      return;
    }
    if (data.kind === 'position') {
      await this.deletePosition.execute({ uuid: data.id });
      return;
    }
    if (data.kind === 'regime') {
      await this.deleteRegime.execute({ uuid: data.id });
      return;
    }
    await this.deleteWorkUnit.execute({ uuid: data.id });
  }

  /**
   * describe turns a failure into the message the interfaces show.
   */
  private describe(error: unknown): string {
    if (error instanceof CatalogValidationError) {
      return error.reason;
    }
    return catalogApiErrorMessage(error, 'No se pudo borrar el registro.');
  }
}
