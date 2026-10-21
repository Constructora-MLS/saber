import { Component, input } from '@angular/core';
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
 */
@Component({
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

  protected statusLabel(status: CatalogStatus): string {
    return catalogStatusLabel(status);
  }

  protected statusClass(status: CatalogStatus): string {
    return status === 'ACTIVE' ? 'is-active' : 'is-inactive';
  }
}
