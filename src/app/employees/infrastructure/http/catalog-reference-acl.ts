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
import {
  REGIME_CHANGED,
  RegimeChangedEvent,
} from '../../../catalog/domain/model/events/regime-changed.event';
import { DomainEventBus } from '../../../shared/infrastructure/domain-event-bus';
import {
  CatalogReferenceResolver,
  PositionReference,
  RegimeAvailability,
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
 * The size of the page used to read the catalogs.
 *
 * The platform caps the page at a hundred records, so the resolver reads
 * the catalogs in pages until it reaches the end.
 */
const CATALOG_PAGE_SIZE = 100;

/**
 * The time the copy of a catalog is kept in memory.
 *
 * The catalog publishes a fact only when a regime changes, so the copy of
 * the units of work and of the positions is kept for a short while: the
 * records that the platform publishes are read again soon, and a record
 * that was just created in the catalog is never hidden for long.
 */
const CATALOG_CACHE_TTL_MS = 60_000;

/**
 * CachedCatalog is a copy of a catalog and the moment it was read.
 */
interface CachedCatalog<T> {
  /** The moment the copy was read. */
  readonly at: number;
  /** The records of the copy. */
  readonly value: readonly T[];
}

/**
 * CatalogReferenceAcl resolves the catalogs that the Employees context
 * points at.
 *
 * The catalogs are read once and they are kept in memory for a short
 * while: the catalog changes rarely, and the listing and the form ask for
 * the same records on every consultation.
 */
@Injectable()
export class CatalogReferenceAcl implements CatalogReferenceResolver {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly events = inject(DomainEventBus);

  private regimes: CachedCatalog<RegimeReference> | null = null;
  private workUnits: CachedCatalog<WorkUnitReference> | null = null;
  private positions: CachedCatalog<PositionReference> | null = null;

  constructor() {
    // The copy of the regimes is dropped when the catalog changes, so the
    // regimes are read again the next time that they are needed. The
    // catalog publishes the fact and this context decides what it does with
    // it.
    this.events.subscribe<RegimeChangedEvent>(REGIME_CHANGED, () => this.invalidate());
  }

  /**
   * resolveRegimes returns the regime of every given reference.
   */
  async resolveRegimes(
    regimeIds: readonly string[],
  ): Promise<ReadonlyMap<string, RegimeReference>> {
    if (regimeIds.length === 0) {
      return new Map();
    }

    const regimes = await this.allRegimes();

    return new Map(
      regimeIds
        .filter((id) => regimes.some((regime) => regime.id === id))
        .map((id) => [id, regimes.find((regime) => regime.id === id)!]),
    );
  }

  /**
   * listRegimes returns the regimes that the worker can choose.
   */
  async listRegimes(): Promise<readonly RegimeReference[]> {
    return this.allRegimes();
  }

  /**
   * findRegime returns the regime of a reference, whatever its availability.
   */
  async findRegime(regimeId: string): Promise<RegimeReference | null> {
    const regimes = await this.allRegimes();

    return regimes.find((regime) => regime.id === regimeId) ?? null;
  }

  /**
   * resolveWorkUnits returns the unit of work of every given reference.
   */
  async resolveWorkUnits(
    workUnitIds: readonly string[],
  ): Promise<ReadonlyMap<string, WorkUnitReference>> {
    if (workUnitIds.length === 0) {
      return new Map();
    }

    const workUnits = await this.allWorkUnits();

    return new Map(
      workUnitIds
        .filter((id) => workUnits.some((unit) => unit.id === id))
        .map((id) => [id, workUnits.find((unit) => unit.id === id)!]),
    );
  }

  /**
   * listWorkUnits returns the units of work that the worker can choose.
   */
  async listWorkUnits(): Promise<readonly WorkUnitReference[]> {
    return this.allWorkUnits();
  }

  /**
   * resolvePositions returns the position of every given reference.
   */
  async resolvePositions(
    positionIds: readonly string[],
  ): Promise<ReadonlyMap<string, PositionReference>> {
    if (positionIds.length === 0) {
      return new Map();
    }

    const positions = await this.allPositions();

    return new Map(
      positionIds
        .filter((id) => positions.some((position) => position.id === id))
        .map((id) => [id, positions.find((position) => position.id === id)!]),
    );
  }

  /**
   * listPositions returns the positions that the worker can choose.
   */
  async listPositions(): Promise<readonly PositionReference[]> {
    return this.allPositions();
  }

  /**
   * allRegimes reads every labor regime of the catalog.
   */
  private async allRegimes(): Promise<readonly RegimeReference[]> {
    if (!this.regimes) {
      this.regimes = {
        at: Date.now(),
        value: await this.read('/regimes', (resource: RegimeResource) => ({
          id: resource.uuid,
          name: resource.name,
          availability: this.availability(resource.status),
        })),
      };
    }

    return this.regimes.value;
  }

  /**
   * allWorkUnits reads every unit of work of the catalog.
   */
  private async allWorkUnits(): Promise<readonly WorkUnitReference[]> {
    if (!this.workUnits) {
      this.workUnits = {
        at: Date.now(),
        value: await this.read('/work-units', (resource: WorkUnitResource) => ({
          id: resource.uuid,
          code: resource.code,
          name: resource.name,
          serviceName: resource.serviceName,
        })),
      };
    }

    return this.workUnits.value;
  }

  /**
   * allPositions reads every position of the catalog.
   */
  private async allPositions(): Promise<readonly PositionReference[]> {
    if (!this.positions) {
      this.positions = {
        at: Date.now(),
        value: await this.read('/positions', (resource: PositionResource) => ({
          id: resource.uuid,
          name: resource.name,
        })),
      };
    }

    return this.positions.value;
  }

  /**
   * read walks the pages of a catalog until the end.
   *
   * A failure of the catalog is propagated: the caller decides what to show,
   * and the incomplete catalog is never cached.
   */
  private async read<TResource, TReference>(
    path: string,
    toReference: (resource: TResource) => TReference,
  ): Promise<readonly TReference[]> {
    const references: TReference[] = [];
    let cursor: string | null = null;

    do {
      const catalogPage: CatalogPageResource<TResource> = await this.readPage<TResource>(
        path,
        cursor,
      );
      for (const item of catalogPage.items) {
        references.push(toReference(item));
      }
      cursor = catalogPage.nextCursor;
    } while (cursor);

    return references;
  }

  /**
   * readPage reads one page of a catalog.
   */
  private async readPage<TResource>(
    path: string,
    cursor: string | null,
  ): Promise<CatalogPageResource<TResource>> {
    let params = new HttpParams().set('limit', String(CATALOG_PAGE_SIZE));
    if (cursor) {
      params = params.set('cursor', cursor);
    }

    return firstValueFrom(
      this.http.get<CatalogPageResource<TResource>>(`${this.baseUrl}${path}`, { params }),
    );
  }

  /**
   * availability translates the published state into the availability of the
   * reference.
   */
  private availability(status: RegimeResource['status']): RegimeAvailability {
    return status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
  }

  /**
   * invalidate drops the copy of the regimes.
   *
   * The next read asks the catalog again, so a regime that changed is
   * published with its new state.
   */
  private invalidate(): void {
    this.regimes = null;
  }
}
