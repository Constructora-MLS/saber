// Package http holds the anti-corruption layer that reads the labor regimes
// of the Catalog bounded context.
//
// The adapter consumes the published contract of the other context, never
// its internals, so the Employees context stays independent of it.
// package http

import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../api.config';
import {
  REGIME_CHANGED,
  RegimeChangedEvent,
} from '../../../catalog/domain/model/events/regime-changed.event';
import { DomainEventBus } from '../../../shared/infrastructure/domain-event-bus';
import {
  RegimeAvailability,
  RegimeNameResolver,
  RegimeOption,
} from '../../domain/services/regime-name-resolver';

/**
 * The published representation of a labor regime.
 *
 * It is the part of the contract of the Catalog context that the Employees
 * context needs: the identifier, the name and the state that tells whether
 * the regime is available.
 */
interface RegimeResource {
  readonly uuid: string;
  readonly name: string;
  readonly status: 'ACTIVE' | 'INACTIVE';
}

/**
 * A page of labor regimes.
 */
interface RegimePageResource {
  readonly items: readonly RegimeResource[];
  readonly nextCursor: string | null;
}

/**
 * The size of the page used to read the regimes.
 *
 * The platform caps the page at a hundred records, so the resolver reads
 * the regimes in pages until it reaches the end.
 */
const REGIME_PAGE_SIZE = 100;

/**
 * CatalogRegimeAcl resolves the regimes of the Catalog bounded context.
 *
 * The regimes are read once and they are kept in memory: the catalog changes
 * rarely, and the listing and the form ask for the same regimes on every
 * consultation.
 */
@Injectable()
export class CatalogRegimeAcl implements RegimeNameResolver {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly events = inject(DomainEventBus);

  private regimes: readonly RegimeOption[] | null = null;
  private pending: Promise<readonly RegimeOption[]> | null = null;
  /**
   * The generation of the catalog that the copy represents.
   *
   * It moves when the catalog changes, so a read that was already in
   * flight never fills the copy with data that is no longer true.
   */
  private generation = 0;

  constructor() {
    // The copy of the catalog is dropped when the catalog changes, so the
    // regimes are read again the next time that they are needed. The
    // catalog publishes the fact and this context decides what it does
    // with it.
    this.events.subscribe<RegimeChangedEvent>(REGIME_CHANGED, () => this.invalidate());
  }

  /**
   * resolveNames returns the name of every available regime of the given
   * references.
   *
   * The failure of the catalog is not a failure of the listing: the names
   * are simply not resolved, and the workers are shown with the regime they
   * carry.
   */
  async resolveNames(regimeIds: readonly string[]): Promise<ReadonlyMap<string, string>> {
    if (regimeIds.length === 0) {
      return new Map();
    }

    const names = await this.availableNames();

    return new Map(regimeIds.filter((id) => names.has(id)).map((id) => [id, names.get(id)!]));
  }

  /**
   * listRegimes returns the regimes that the worker can choose.
   *
   * Only the available regimes are offered: an unavailable regime is not a
   * choice.
   */
  async listRegimes(): Promise<readonly RegimeOption[]> {
    const regimes = await this.all();

    return regimes.filter((regime) => regime.availability === 'ACTIVE');
  }

  /**
   * findRegime returns the regime of a reference, whatever its availability.
   *
   * A form that modifies a record needs the regime that the record already
   * carries, even when it is no longer available: hiding it would make the
   * form lose the value of the record.
   */
  async findRegime(regimeId: string): Promise<RegimeOption | null> {
    const regimes = await this.all();

    return regimes.find((regime) => regime.id === regimeId) ?? null;
  }

  /**
   * availableNames returns the name of every available regime.
   */
  private async availableNames(): Promise<ReadonlyMap<string, string>> {
    const regimes = await this.all();

    return new Map(
      regimes
        .filter((regime) => regime.availability === 'ACTIVE')
        .map((regime) => [regime.id, regime.name]),
    );
  }

  /**
   * all reads every regime of the catalog, once.
   *
   * Only a complete read is cached: a failed read is not, so a catalog that
   * was unreachable does not leave an empty catalog cached for the whole
   * session.
   */
  private async all(): Promise<readonly RegimeOption[]> {
    if (this.regimes) {
      return this.regimes;
    }
    if (this.pending) {
      return this.pending;
    }

    const generation = this.generation;
    this.pending = this.read()
      .then((regimes) => {
        // The copy is only kept when the catalog did not change while it
        // was being read.
        if (generation === this.generation) {
          this.regimes = regimes;
        }
        return regimes;
      })
      .finally(() => {
        this.pending = null;
      });

    return this.pending;
  }

  /**
   * invalidate drops the copy of the catalog.
   *
   * The next read asks the catalog again, so a regime that changed is
   * published with its new state.
   */
  private invalidate(): void {
    this.generation++;
    this.regimes = null;
  }

  /**
   * read walks the pages of the catalog until the end.
   *
   * A failure of the catalog is propagated: the caller decides what to show,
   * and the incomplete catalog is never cached.
   */
  private async read(): Promise<readonly RegimeOption[]> {
    const regimes: RegimeOption[] = [];
    let cursor: string | null = null;

    do {
      const page = await this.page(cursor);
      for (const regime of page.items) {
        regimes.push({
          id: regime.uuid,
          name: regime.name,
          availability: this.availability(regime.status),
        });
      }
      cursor = page.nextCursor;
    } while (cursor);

    return regimes;
  }

  /**
   * availability translates the published state into the availability of the
   * domain.
   */
  private availability(status: RegimeResource['status']): RegimeAvailability {
    return status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
  }

  /**
   * page reads one page of the regimes of the catalog.
   */
  private async page(cursor: string | null): Promise<RegimePageResource> {
    let params = new HttpParams().set('limit', String(REGIME_PAGE_SIZE));
    if (cursor) {
      params = params.set('cursor', cursor);
    }

    return firstValueFrom(
      this.http
        .get<RegimePageResource>(`${this.baseUrl}/regimes`, { params })
        .pipe(catchError((error: HttpErrorResponse) => {
          throw error;
        })),
    );
  }
}
