// Package person-summary holds the identity card shown in the Employees
// bounded context.
// package person-summary

import { Component, input } from '@angular/core';

/**
 * PersonSummaryFact is one of the facts that the record of a worker shows
 * under its identity.
 *
 * The fact is a pair of a name and a value, so the component stays
 * presentational: the caller decides which facts matter in its own
 * context.
 */
export interface PersonSummaryFact {
  /** The name of the fact, shown in small capitals. */
  readonly label: string;
  /** The value of the fact. */
  readonly value: string;
}

/**
 * PersonSummary shows the identity of a worker.
 *
 * The component is presentational: it renders the identity of the record
 * and it leaves the actions of the record to the caller, through the
 * content projection. It never talks to the API.
 */
@Component({
  selector: 'app-person-summary',
  styleUrl: './person-summary.scss',
  templateUrl: './person-summary.html',
})
export class PersonSummary {
  /** The context of the record, shown above the name. */
  readonly eyebrow = input.required<string>();
  /** The full name of the worker. */
  readonly name = input.required<string>();
  /** The name of the document that identifies the worker. */
  readonly documentLabel = input('DNI');
  /** The value of the document that identifies the worker. */
  readonly documentValue = input.required<string>();
  /** The facts of the record, shown under the identity. */
  readonly facts = input<readonly PersonSummaryFact[]>([]);
  /** The identifier of the title of the record, so a page can label its
   * region with the name of the worker. */
  readonly headingId = input<string | null>(null);
}
