import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../api.config';
import { toEmployeeApiError } from '../errors/employee-api.error';
import {
  normalizeCatalogSearch,
  CATALOG_SELECTOR_PAGE_SIZE as CATALOG_PAGE_SIZE,
} from '../../../shared/application/queries/catalog-search';

export type CatalogAvailability = 'ACTIVE' | 'INACTIVE';

export interface RegimeReference {
  readonly id: string;
  readonly name: string;
  readonly availability: CatalogAvailability;
}

export interface WorkUnitReference {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly serviceName: string;
  readonly availability: CatalogAvailability;
}

export interface PositionReference {
  readonly id: string;
  readonly name: string;
  readonly availability: CatalogAvailability;
}

export interface CatalogReferenceResolver {
  resolveRegimes(regimeIds: readonly string[]): Promise<ReadonlyMap<string, RegimeReference>>;
  listRegimes(search?: string): Promise<readonly RegimeReference[]>;
  findRegime(regimeId: string): Promise<RegimeReference | null>;
  resolveWorkUnits(workUnitIds: readonly string[]): Promise<ReadonlyMap<string, WorkUnitReference>>;
  listWorkUnits(search?: string): Promise<readonly WorkUnitReference[]>;
  resolvePositions(positionIds: readonly string[]): Promise<ReadonlyMap<string, PositionReference>>;
  listPositions(search?: string): Promise<readonly PositionReference[]>;
}

export const CATALOG_REFERENCE_RESOLVER = new InjectionToken<CatalogReferenceResolver>(
  'CATALOG_REFERENCE_RESOLVER',
  {
    providedIn: 'root',
    factory: () => inject(CatalogReferenceAcl),
  },
);

interface RegimeResource {
  readonly uuid: string;
  readonly name: string;
  readonly status: 'ACTIVE' | 'INACTIVE';
}

interface WorkUnitResource {
  readonly uuid: string;
  readonly code: string;
  readonly name: string;
  readonly serviceName: string;
  readonly status: 'ACTIVE' | 'INACTIVE';
}

interface PositionResource {
  readonly uuid: string;
  readonly name: string;
  readonly status: 'ACTIVE' | 'INACTIVE';
}

const MAX_IDS_PER_REQUEST = 100;

@Injectable({ providedIn: 'root' })
export class CatalogReferenceAcl implements CatalogReferenceResolver {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  async resolveRegimes(
    regimeIds: readonly string[],
  ): Promise<ReadonlyMap<string, RegimeReference>> {
    return this.resolve('/regimes', regimeIds, (resource: RegimeResource) => ({
      id: resource.uuid,
      name: resource.name,
      availability: this.availability(resource.status),
    }));
  }

  async listRegimes(search?: string): Promise<readonly RegimeReference[]> {
    const records = await this.read<RegimeResource>('/regimes', {
      search: this.term(search),
      status: 'ACTIVE',
      limit: CATALOG_PAGE_SIZE,
    });

    return records.map((resource) => ({
      id: resource.uuid,
      name: resource.name,
      availability: this.availability(resource.status),
    }));
  }

  async findRegime(regimeId: string): Promise<RegimeReference | null> {
    const regimes = await this.resolveRegimes([regimeId]);

    return regimes.get(regimeId) ?? null;
  }

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

  async listWorkUnits(search?: string): Promise<readonly WorkUnitReference[]> {
    const records = await this.read<WorkUnitResource>('/work-units', {
      search: this.term(search),
      status: 'ACTIVE',
      limit: CATALOG_PAGE_SIZE,
    });

    return records.map((resource) => ({
      id: resource.uuid,
      code: resource.code,
      name: resource.name,
      serviceName: resource.serviceName,
      availability: this.availability(resource.status),
    }));
  }

  async resolvePositions(
    positionIds: readonly string[],
  ): Promise<ReadonlyMap<string, PositionReference>> {
    return this.resolve('/positions', positionIds, (resource: PositionResource) => ({
      id: resource.uuid,
      name: resource.name,
      availability: this.availability(resource.status),
    }));
  }

  async listPositions(search?: string): Promise<readonly PositionReference[]> {
    const records = await this.read<PositionResource>('/positions', {
      search: this.term(search),
      status: 'ACTIVE',
      limit: CATALOG_PAGE_SIZE,
    });

    return records.map((resource) => ({
      id: resource.uuid,
      name: resource.name,
      availability: this.availability(resource.status),
    }));
  }

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
      const records = await this.read<TResource>(path, {
        ids: ids.slice(index, index + MAX_IDS_PER_REQUEST),
        limit: MAX_IDS_PER_REQUEST,
      });

      for (const item of records) {
        const reference = toReference(item);
        references.set(reference.id, reference);
      }
    }

    return references;
  }

  private async read<TResource>(
    path: string,
    filters: {
      readonly search?: string;
      readonly status?: string;
      readonly ids?: readonly string[];
      readonly limit: number;
    },
  ): Promise<readonly TResource[]> {
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

    const page = await firstValueFrom(
      this.http
        .get<{ readonly items: readonly TResource[] }>(`${this.baseUrl}${path}`, { params })
        .pipe(
          catchError((error: unknown) => {
            if (!(error instanceof HttpErrorResponse)) {
              return throwError(() => error);
            }
            return throwError(() => toEmployeeApiError(error.status, error.error));
          }),
        ),
    );

    return page.items;
  }

  private term(search: string | undefined): string | undefined {
    return normalizeCatalogSearch(search);
  }

  private availability(status: 'ACTIVE' | 'INACTIVE'): CatalogAvailability {
    return status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
  }
}
