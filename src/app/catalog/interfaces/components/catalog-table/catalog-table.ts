import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TableState } from '../../../../shared/interfaces/components/table-state/table-state';
import {
  CatalogStatus,
  catalogStatusLabel,
} from '../../../domain/model/value-objects/catalog-status';

/**
 * CatalogCellKind is the kind of the content of a column.
 *
 * The kind drives the presentation of the cell, so every catalog shares the
 * same table without repeating the markup of each column.
 */
export type CatalogCellKind = 'code' | 'name' | 'description' | 'reference' | 'status';

/**
 * CatalogColumn is the definition of a column of the table.
 */
export interface CatalogColumn {
  /** The header of the column. */
  readonly header: string;
  /** The kind of the content of the column. */
  readonly kind: CatalogCellKind;
}

/**
 * CatalogRow is the presentation of a record of a catalog.
 */
export interface CatalogRow {
  /** The identifier of the record. */
  readonly id: string;
  /** The code of the record, when it has one. */
  readonly code: string | null;
  /** The name of the record. */
  readonly name: string;
  /** The description of the record, when it has one. */
  readonly description: string | null;
  /** The reference of the record, when it has one. */
  readonly reference: string | null;
  /** The state of the record. */
  readonly status: CatalogStatus;
}

/**
 * CatalogTable shows the records of a catalog.
 *
 * The table is presentational: it renders the records and it announces the
 * intentions of the worker through its outputs. It never talks to the API.
 */
@Component({
  imports: [MatButtonModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule, TableState],
  selector: 'app-catalog-table',
  styleUrl: './catalog-table.scss',
  templateUrl: './catalog-table.html',
})
export class CatalogTable {
  /** The caption of the table, read by the assistive technologies. */
  readonly caption = input.required<string>();
  /** The columns of the table. */
  readonly columns = input.required<readonly CatalogColumn[]>();
  /** The records of the table. */
  readonly rows = input.required<readonly CatalogRow[]>();
  /** Whether the table is waiting for the records. */
  readonly loading = input(false);
  /** The message shown when the catalog has no records. */
  readonly emptyMessage = input('Todavía no hay registros en este catálogo.');
  /** The label of the action that offers to register the first record. */
  readonly emptyActionLabel = input<string | null>(null);
  /** The headline of the failure that prevented the consultation. */
  readonly errorTitle = input<string | null>(null);
  /** The detail of the failure that prevented the consultation. */
  readonly errorMessage = input<string | null>(null);

  /** The record whose edition was requested. */
  readonly editRequested = output<CatalogRow>();
  /** The record whose deletion was requested. */
  readonly deleteRequested = output<CatalogRow>();
  /** The consultation of the catalog was requested again. */
  readonly retryRequested = output<void>();
  /** The registration of a record was requested. */
  readonly createRequested = output<void>();

  protected statusLabel(status: CatalogStatus): string {
    return catalogStatusLabel(status);
  }
}
