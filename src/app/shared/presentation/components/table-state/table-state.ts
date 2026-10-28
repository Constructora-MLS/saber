import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * TableStateKind is the kind of state a table shows in place of its records.
 *
 * The kind drives the color roles and the icon of the state, so every table
 * of the platform reports the absence of data and the failure of the
 * service with the same visual language.
 */
export type TableStateKind = 'empty' | 'error';

/**
 * TableState shows the state of a table that has no records to show.
 *
 * The component is presentational: it renders the state and it announces the
 * intention of the worker through its output. It never talks to the API.
 */
@Component({
  imports: [MatButtonModule, MatIconModule],
  selector: 'app-table-state',
  styleUrl: './table-state.scss',
  templateUrl: './table-state.html',
})
export class TableState {
  /** The kind of the state: an empty catalog or a failed consultation. */
  readonly kind = input.required<TableStateKind>();
  /** The headline of the state. */
  readonly title = input<string | null>(null);
  /** The supporting text of the state. */
  readonly message = input<string | null>(null);
  /** The icon of the state, when the caller chooses one. */
  readonly icon = input<string | null>(null);
  /** The label of the action of the state, when the caller offers one. */
  readonly actionLabel = input<string | null>(null);
  /** The icon of the action of the state. */
  readonly actionIcon = input<string | null>(null);
  /** Whether the state is shown next to the records of the table. */
  readonly compact = input(false);

  /** The action of the state was requested. */
  readonly actionRequested = output<void>();

  /** The icon of the state, according to its kind. */
  protected readonly resolvedIcon = computed(
    () => this.icon() ?? (this.kind() === 'error' ? 'cloud_off' : 'inventory_2'),
  );

  /** The icon of the action, according to its kind. */
  protected readonly resolvedActionIcon = computed(
    () => this.actionIcon() ?? (this.kind() === 'error' ? 'refresh' : 'add'),
  );
}
