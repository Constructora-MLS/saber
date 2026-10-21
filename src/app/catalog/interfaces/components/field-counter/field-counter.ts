// Package fieldcounter holds the character counter of the catalog forms.

import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { CATALOG_NAME_MAX_LENGTH } from '../../../domain/model/value-objects/catalog-name';
import { DESCRIPTION_MAX_LENGTH } from '../../../domain/model/value-objects/description';

/**
 * FieldCounterLimit is the kind of text that the counter measures.
 */
export type FieldCounterLimit = 'name' | 'description';

/**
 * The share of the limit that turns the counter into a warning.
 *
 * The worker sees that the field is almost full before the text is
 * rejected, so the limit is never a surprise.
 */
const FIELD_COUNTER_WARNING_RATIO = 0.9;

/**
 * FieldCounter writes the number of characters of a field in its hint.
 *
 * The counter is the way Material shows how much room is left in a field,
 * and the limit of every text is the limit of the platform, so the counter
 * and the validation never disagree.
 */
@Component({
  selector: 'mat-hint[appFieldCounter]',
  template: `{{ length() }} / {{ max() }}`,
  host: {
    class: 'field-counter',
    '[class.is-warning]': 'isWarning()',
  },
  styles: [
    `
      :host {
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.02em;
      }

      :host(.is-warning) {
        color: var(--mat-sys-error);
        font-weight: 700;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldCounter {
  /** The control that the counter measures. */
  readonly control = input.required<AbstractControl>();
  /** The kind of text that the counter measures. */
  readonly limit = input.required<FieldCounterLimit>();

  /** The number of characters of the field. */
  protected readonly length = signal(0);

  /** The limit of the field. */
  protected readonly max = computed(() =>
    this.limit() === 'name' ? CATALOG_NAME_MAX_LENGTH : DESCRIPTION_MAX_LENGTH,
  );

  /** Whether the field is almost full. */
  protected readonly isWarning = computed(
    () => this.length() >= this.max() * FIELD_COUNTER_WARNING_RATIO,
  );

  constructor() {
    effect((onCleanup) => {
      const control = this.control();
      const measure = (value: unknown): void => {
        this.length.set(typeof value === 'string' ? value.length : 0);
      };

      measure(control.value);
      const subscription = control.valueChanges.subscribe(measure);
      onCleanup(() => subscription.unsubscribe());
    });
  }
}
