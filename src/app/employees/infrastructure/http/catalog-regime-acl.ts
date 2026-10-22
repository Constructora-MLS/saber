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
  RegimeNameResolver,
  RegimeOption,
} from '../../domain/services/regime-name-resolver';

/**
 * The published representation of a labor regime.
 *
 * It is the part of the contract of the Catalog context that the Employees
 * context needs: the identifier and the name.
 */
interface RegimeResource {
  readonly uuid: string;
  readonly name: string;
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

  private regimes: readonly RegimeOption[] | null = null;
  private pending: Promise<readonly RegimeOption[]> | null = null;

  /**
   * resolveNames returns the name of every regime of the given references.
   *
   * The failure of the catalog is not a failure of the listing: the names
   * are simply not resolved, and the workers are shown with the regime they
   * carry.
   */
  async resolveNames(regimeIds: readonly string[]): Promise<ReadonlyMap<string, string>> {
    if (regimeIds.length === 0) {
      return new Map();
    }

    const names = await this.allNames();

    return new Map(regimeIds.filter((id) => names.has(id)).map((id) => [id, names.get(id)!]));
  }

  /**
   * listRegimes returns the regimes that the worker can choose.
   */
  async listRegimes(): Promise<readonly RegimeOption[]> {
    return this.all();
  }

  /**
   * allNames returns the name of every regime of the catalog.
   */
  private async allNames(): Promise<ReadonlyMap<string, string>> {
    const regimes = await this.all();

    return new Map(regimes.map((regime) => [regime.id, regime.name]));
  }

  /**
   * all reads every regime of the catalog, once.
   */
  private async all(): Promise<readonly RegimeOption[]> {
    if (this.regimes) {
      return this.regimes;
    }
    if (this.pending) {
      return this.pending;
    }

    this.pending = this.read()
      .then((regimes) => {
        this.regimes = regimes;
        return regimes;
      })
      .finally(() => {
        this.pending = null;
      });

    return this.pending;
  }

  /**
   * read walks the pages of the catalog until the end.
   */
  private async read(): Promise<readonly RegimeOption[]> {
    const regimes: RegimeOption[] = [];
    let cursor: string | null = null;

    do {
      let page: RegimePageResource;
      try {
        page = await this.page(cursor);
      } catch {
        // The catalog is not reachable: the listing shows the workers
        // without the name of their regime, and it is not broken.
        return regimes;
      }
      for (const regime of page.items) {
        regimes.push({ id: regime.uuid, name: regime.name });
      }
      cursor = page.nextCursor;
    } while (cursor);

    return regimes;
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
