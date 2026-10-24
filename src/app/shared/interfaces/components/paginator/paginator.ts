// Package paginator holds the pagination of the listings.
//
// The worker moves between the pages of a listing without leaving the
// screen.
// package paginator

import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { visiblePages } from './paginator-pages';

/**
 * PaginatorPage is a page of the paginator.
 */
export interface PaginatorPage {
  /** The number of the page. */
  readonly number: number;
  /** Whether the page is the one that is shown. */
  readonly current: boolean;
}

/**
 * Paginator shows the pages of a listing.
 *
 * The component is presentational: it shows the pages that the listing has
 * and it announces the page that the worker asks for. It never talks to the
 * API.
 */
@Component({
  imports: [MatButtonModule, MatIconModule],
  selector: 'app-paginator',
  styleUrl: './paginator.scss',
  templateUrl: './paginator.html',
})
export class Paginator {
  /** The number of the page that is shown, starting at one. */
  readonly page = input.required<number>();
  /** The number of pages of the listing. */
  readonly totalPages = input.required<number>();
  /** The number of records that match the query. */
  readonly total = input(0);
  /** The name of the records that the listing shows. */
  readonly label = input('registros');

  /** The page that the worker asked for. */
  readonly pageRequested = output<number>();

  /**
   * The pages that the paginator shows.
   */
  protected readonly pages = computed<readonly PaginatorPage[]>(() => {
    const current = this.page();

    return visiblePages(current, this.totalPages()).map((number) => ({
      number,
      current: number === current,
    }));
  });

  /**
   * goTo asks for a page of the listing.
   */
  protected goTo(number: number): void {
    if (number < 1 || number > this.totalPages() || number === this.page()) {
      return;
    }

    this.pageRequested.emit(number);
  }
}
