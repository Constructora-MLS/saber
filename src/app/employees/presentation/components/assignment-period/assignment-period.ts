// Package assignmentperiod shows the labour period of an assignment.
//
// The component is presentational: it renders the period of the assignment
// in the language of the interfaces and it never talks to the API.
// package assignmentperiod

import { Component, computed, input } from '@angular/core';
import { formatAssignmentPeriod } from './assignment-period.format';

/**
 * AssignmentPeriod shows the period of the labour of an assignment.
 *
 * An open period is announced with "Desde", and a closed one with the two
 * dates that bound it. The year is shown once when both dates belong to
 * the same year, so the period of a year reads as one date range.
 */
@Component({
  selector: 'app-assignment-period',
  template: '<span class="period">{{ label() }}</span>',
  styles: [
    `
      :host {
        display: inline-block;
      }

      .period {
        white-space: nowrap;
      }
    `,
  ],
})
export class AssignmentPeriod {
  /** The date the labour period starts, in the YYYY-MM-DD format. */
  readonly startDate = input.required<string>();
  /** The date the labour period was closed, in the YYYY-MM-DD format. */
  readonly endDate = input<string | null>(null);

  /** The period of the assignment, in the language of the interfaces. */
  protected readonly label = computed(() =>
    formatAssignmentPeriod(this.startDate(), this.endDate()),
  );
}
