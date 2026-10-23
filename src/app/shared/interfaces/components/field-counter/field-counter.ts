// Package fieldcounter holds the character counter of the forms of the
// platform.

import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';

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
 *
 * The component is presentational: it measures the control that the caller
 * gives and it never talks to the API. The limit travels as a number, so
 * every bounded context measures its own fields with its own rules.
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
  /** The limit of the field. */
  readonly max = input.required<number>();

  /** The number of characters of the field. */
  protected readonly length = signal(0);

  /** Whether the field is almost full. */
  protected readonly isWarning = computed(
    () => this.length() >= this.max() * FIELD_COUNTER_WARNING_RATIO,
  );

  constructor() {
    effect((onCleanup) => {
      const control = this.control();
      const measure = (value: unknown): void => {
        // The platform counts the characters by code point, so the counter
        // counts them the same way.
        this.length.set(typeof value === 'string' ? [...value].length : 0);
      };

      measure(control.value);
      const subscription = control.valueChanges.subscribe(measure);
      onCleanup(() => subscription.unsubscribe());
    });
  }
}
