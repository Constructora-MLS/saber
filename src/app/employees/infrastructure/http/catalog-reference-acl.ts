// Package http holds the anti-corruption layer that reads the catalogs of
// the Catalog bounded context.
//
// The adapter consumes the published contract of the other context, never
// its internals, so the Employees context stays independent of it.
// package http

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../api.config';
import { normalizeCatalogSearch } from '../../application/queries/catalog-search';
import {
  CatalogAvailability,
  CatalogReferenceResolver,
  PositionReference,
  RegimeReference,
  WorkUnitReference,
} from '../../domain/services/catalog-reference-resolver';

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
 * The published representation of a unit of work.
 *
 * It is the part of the contract of the Catalog context that the Employees
 * context needs: the identifier, the code, the name and the service the
 * unit belongs to.
 */
interface WorkUnitResource {
  readonly uuid: string;
  readonly code: string;
  readonly name: string;
  readonly serviceName: string;
  readonly status: 'ACTIVE' | 'INACTIVE';
}

/**
 * The published representation of a position.
 */
interface PositionResource {
  readonly uuid: string;
  readonly name: string;
  readonly status: 'ACTIVE' | 'INACTIVE';
}

/**
 * A page of records of the catalog.
 */
interface CatalogPageResource<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

/**
 * The size of the page that a selector shows.
 *
 * The platform caps the page at a hundred records, and a selector offers
 * twenty of them: the worker looks for a record among the ones that match
 * the term, never among the whole catalog.
 */
const CATALOG_PAGE_SIZE = 20;

/**
 * The highest number of identifiers that a resolution asks for at once.
 *
 * The platform caps the page at a hundred records, so a resolution of more
 * identifiers is asked in several pages.
 */
const MAX_IDS_PER_REQUEST = 100;

/**
 * CatalogReferenceAcl resolves the catalogs that the Employees context
 * points at.
 *
 * The adapter never keeps a copy of a catalog: every read asks the platform
 * for the page it needs, so a record that was just created in the catalog is
 * offered the next time that a selector looks for it.
 */ @Injectable()
export class CatalogReferenceAcl implements CatalogReferenceResolver {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * resolveRegimes returns the regime of every given reference.
   */
  async resolveRegimes(
    regimeIds: readonly string[],
  ): Promise<ReadonlyMap<string, RegimeReference>> {
    return this.resolve('/regimes', regimeIds, (resource: RegimeResource) => ({
      id: resource.uuid,
      name: resource.name,
      availability: this.availability(resource.status),
    }));
  }

  /**
   * listRegimes returns the available regimes that match the term.
   */
  async listRegimes(search?: string): Promise<readonly RegimeReference[]> {
    const page = await this.read<RegimeResource>('/regimes', {
      search: this.term(search),
      status: 'ACTIVE',
      limit: CATALOG_PAGE_SIZE,
    });

    return page.items.map((resource) => ({
      id: resource.uuid,
      name: resource.name,
      availability: this.availability(resource.status),
    }));
  }

  /**
   * findRegime returns the regime of a reference, whatever its availability.
   */
  async findRegime(regimeId: string): Promise<RegimeReference | null> {
    const regimes = await this.resolveRegimes([regimeId]);

    return regimes.get(regimeId) ?? null;
  }

  /**
   * resolveWorkUnits returns the unit of work of every given reference.
   */
  async resolveWorkUnits(
    workUnitIds: readonly string[],
  ): Promise<ReadonlyMap<string, WorkUnitReference>> {
    return this.resolve('/work-units', workUnitIds, (resource: WorkUnitResource) => ({
      id: resource.uuid,
      code: resource.code,
      name: resource.name,
      serviceName: resource.serviceName,
      availability: this.availability(resource.status),
    }));
  }

  /**
   * listWorkUnits returns the available units of work that match the term.
   */
  async listWorkUnits(search?: string): Promise<readonly WorkUnitReference[]> {
    const page = await this.read<WorkUnitResource>('/work-units', {
      search: this.term(search),
      status: 'ACTIVE',
      limit: CATALOG_PAGE_SIZE,
    });

    return page.items.map((resource) => ({
      id: resource.uuid,
      code: resource.code,
      name: resource.name,
      serviceName: resource.serviceName,
      availability: this.availability(resource.status),
    }));
  }

  /**
   * resolvePositions returns the position of every given reference.
   */
  async resolvePositions(
    positionIds: readonly string[],
  ): Promise<ReadonlyMap<string, PositionReference>> {
    return this.resolve('/positions', positionIds, (resource: PositionResource) => ({
      id: resource.uuid,
      name: resource.name,
      availability: this.availability(resource.status),
    }));
  }

  /**
   * listPositions returns the available positions that match the term.
   */
  async listPositions(search?: string): Promise<readonly PositionReference[]> {
    const page = await this.read<PositionResource>('/positions', {
      search: this.term(search),
      status: 'ACTIVE',
      limit: CATALOG_PAGE_SIZE,
    });

    return page.items.map((resource) => ({
      id: resource.uuid,
      name: resource.name,
      availability: this.availability(resource.status),
    }));
  }

  /**
   * resolve reads a known set of records of a catalog.
   *
   * The platform answers the whole set in one page, so a page of
   * assignments never downloads a whole catalog.
   */
  private async resolve<
    TResource extends { readonly uuid: string },
    TReference extends {
      readonly id: string;
    },
  >(
    path: string,
    ids: readonly string[],
    toReference: (resource: TResource) => TReference,
  ): Promise<ReadonlyMap<string, TReference>> {
    const references = new Map<string, TReference>();

    for (let index = 0; index < ids.length; index += MAX_IDS_PER_REQUEST) {
      const page = await this.read<TResource>(path, {
        ids: ids.slice(index, index + MAX_IDS_PER_REQUEST),
        limit: MAX_IDS_PER_REQUEST,
      });

      for (const item of page.items) {
        const reference = toReference(item);
        references.set(reference.id, reference);
      }
    }

    return references;
  }

  /**
   * read asks the platform for a page of a catalog.
   */
  private async read<TResource>(
    path: string,
    filters: {
      readonly search?: string;
      readonly status?: string;
      readonly ids?: readonly string[];
      readonly limit: number;
    },
  ): Promise<CatalogPageResource<TResource>> {
    let params = new HttpParams().set('limit', String(filters.limit));
    if (filters.search) {
      params = params.set('search', filters.search);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.ids) {
      params = params.set('ids', filters.ids.join(','));
    }

    return firstValueFrom(
      this.http.get<CatalogPageResource<TResource>>(`${this.baseUrl}${path}`, { params }),
    );
  }

  /**
   * term prepares the search of a listing.
   *
   * The term that the platform would reject is dropped, so the listing
   * shows the first page of the catalog instead of an error.
   */
  private term(search: string | undefined): string | undefined {
    return normalizeCatalogSearch(search);
  }

  /**
   * availability translates the published state into the availability of the
   * reference.
   */
  private availability(status: 'ACTIVE' | 'INACTIVE'): CatalogAvailability {
    return status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
  }
}
