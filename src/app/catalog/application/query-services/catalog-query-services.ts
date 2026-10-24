// Package queryservices holds the use cases that read the state of the
// Catalog bounded context.
//
// The listings are served by page number, so the worker reaches any page of
// the listing with a single request.
// package queryservices

import { inject, Injectable } from '@angular/core';
import { normalizeCatalogSearch } from '../queries/catalog-search';
import {
  ListPositionsQuery,
  ListRegimesQuery,
  ListServicesQuery,
  ListWorkUnitsQuery,
} from '../queries/catalog-queries';
import {
  CatalogCriteria,
  CatalogPage,
  POSITION_REPOSITORY,
  REGIME_REPOSITORY,
  SERVICE_REPOSITORY,
  WORK_UNIT_REPOSITORY,
  WorkUnitCriteria,
} from '../../domain/repositories/catalog-repositories';
import { Position } from '../../domain/model/aggregates/position';
import { Regime } from '../../domain/model/aggregates/regime';
import { Service } from '../../domain/model/aggregates/service';
import { WorkUnit } from '../../domain/model/aggregates/work-unit';

/**
 * ListServicesQueryService returns the page of the services that matches the
 * query.
 */
@Injectable({ providedIn: 'root' })
export class ListServicesQueryService {
  private readonly repository = inject(SERVICE_REPOSITORY);

  async execute(query: ListServicesQuery): Promise<CatalogPage<Service>> {
    return this.repository.listServices(this.criteria(query));
  }

  private criteria(query: ListServicesQuery): CatalogCriteria {
    return {
      search: this.search(query.search),
      status: query.status,
      limit: query.limit,
      page: query.page,
    };
  }

  private search(raw: string | undefined): string | undefined {
    return normalizeCatalogSearch(raw);
  }
}

/**
 * ListPositionsQueryService returns the page of the positions that matches
 * the query.
 */
@Injectable({ providedIn: 'root' })
export class ListPositionsQueryService {
  private readonly repository = inject(POSITION_REPOSITORY);

  async execute(query: ListPositionsQuery): Promise<CatalogPage<Position>> {
    return this.repository.listPositions({
      search: this.search(query.search),
      status: query.status,
      limit: query.limit,
      page: query.page,
    });
  }

  private search(raw: string | undefined): string | undefined {
    return normalizeCatalogSearch(raw);
  }
}

/**
 * ListRegimesQueryService returns the page of the regimes that matches the
 * query.
 */
@Injectable({ providedIn: 'root' })
export class ListRegimeQueryService {
  private readonly repository = inject(REGIME_REPOSITORY);

  async execute(query: ListRegimesQuery): Promise<CatalogPage<Regime>> {
    return this.repository.listRegimes({
      search: this.search(query.search),
      status: query.status,
      limit: query.limit,
      page: query.page,
    });
  }

  private search(raw: string | undefined): string | undefined {
    return normalizeCatalogSearch(raw);
  }
}

/**
 * ListWorkUnitsQueryService returns the page of the work units that matches
 * the query.
 */
@Injectable({ providedIn: 'root' })
export class ListWorkUnitsQueryService {
  private readonly repository = inject(WORK_UNIT_REPOSITORY);

  async execute(query: ListWorkUnitsQuery): Promise<CatalogPage<WorkUnit>> {
    const serviceId = query.serviceId?.trim();
    const criteria: WorkUnitCriteria = {
      search: this.search(query.search),
      status: query.status,
      limit: query.limit,
      page: query.page,
      ...(serviceId ? { serviceId } : {}),
    };

    return this.repository.listWorkUnits(criteria);
  }

  private search(raw: string | undefined): string | undefined {
    return normalizeCatalogSearch(raw);
  }
}
