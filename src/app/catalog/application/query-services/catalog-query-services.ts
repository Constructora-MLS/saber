import { inject, Injectable } from '@angular/core';
import { normalizeCatalogSearch } from '../../../shared/application/queries/catalog-search';
import {
  CatalogCriteria,
  CatalogPage,
  ListPositionsQuery,
  ListRegimesQuery,
  ListServicesQuery,
  ListWorkUnitsQuery,
  WorkUnitCriteria,
} from '../queries/catalog-queries';
import { CatalogGateway } from '../../infrastructure/gateways/catalog.gateway';
import { Position } from '../../domain/model/aggregates/position';
import { Regime } from '../../domain/model/aggregates/regime';
import { Service } from '../../domain/model/aggregates/service';
import { WorkUnit } from '../../domain/model/aggregates/work-unit';

@Injectable({ providedIn: 'root' })
export class ListServicesQueryService {
  private readonly gateway = inject(CatalogGateway);

  async execute(query: ListServicesQuery): Promise<CatalogPage<Service>> {
    return this.gateway.listServices(this.criteria(query));
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

@Injectable({ providedIn: 'root' })
export class ListPositionsQueryService {
  private readonly gateway = inject(CatalogGateway);

  async execute(query: ListPositionsQuery): Promise<CatalogPage<Position>> {
    return this.gateway.listPositions({
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

@Injectable({ providedIn: 'root' })
export class ListRegimeQueryService {
  private readonly gateway = inject(CatalogGateway);

  async execute(query: ListRegimesQuery): Promise<CatalogPage<Regime>> {
    return this.gateway.listRegimes({
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

@Injectable({ providedIn: 'root' })
export class ListWorkUnitsQueryService {
  private readonly gateway = inject(CatalogGateway);

  async execute(query: ListWorkUnitsQuery): Promise<CatalogPage<WorkUnit>> {
    const serviceId = query.serviceId?.trim();
    const criteria: WorkUnitCriteria = {
      search: this.search(query.search),
      status: query.status,
      limit: query.limit,
      page: query.page,
      ...(serviceId ? { serviceId } : {}),
    };

    return this.gateway.listWorkUnits(criteria);
  }

  private search(raw: string | undefined): string | undefined {
    return normalizeCatalogSearch(raw);
  }
}
