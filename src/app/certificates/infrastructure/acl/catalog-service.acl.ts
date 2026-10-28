import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import { API_BASE_URL } from '../../../api.config';
import { toCatalogApiError } from '../../../catalog/infrastructure/errors/catalog-api.error';
import {
  CATALOG_SELECTOR_PAGE_SIZE,
  normalizeCatalogSearch,
} from '../../../shared/application/queries/catalog-search';

export interface CertificateServiceReference {
  readonly id: string;
  readonly name: string;
}

export interface CertificateWorkUnitReference {
  readonly code: string;
  readonly name: string;
}

export interface CertificateServiceResolver {
  listWorkUnits(search?: string): Promise<readonly CertificateWorkUnitReference[]>;
  resolveServiceNames(serviceIds: readonly string[]): Promise<ReadonlyMap<string, string>>;
  listServices(): Promise<readonly CertificateServiceReference[]>;
}

export const CERTIFICATE_SERVICE_RESOLVER = new InjectionToken<CertificateServiceResolver>(
  'CERTIFICATE_SERVICE_RESOLVER',
  {
    providedIn: 'root',
    factory: () => inject(CatalogServiceAcl),
  },
);

interface ServiceResource {
  readonly uuid: string;
  readonly name: string;
}

const MAX_IDS_PER_REQUEST = 100;
const SERVICE_PAGE_SIZE = 100;

@Injectable({ providedIn: 'root' })
export class CatalogServiceAcl implements CertificateServiceResolver {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  async listWorkUnits(search?: string): Promise<readonly CertificateWorkUnitReference[]> {
    let params = new HttpParams().set('limit', CATALOG_SELECTOR_PAGE_SIZE).set('page', 1);
    const term = normalizeCatalogSearch(search);
    if (term) params = params.set('search', term);
    const page = await firstValueFrom(
      this.http.get<{
        readonly items: readonly { readonly code: string; readonly name: string }[];
      }>(`${this.baseUrl}/work-units`, { params }).pipe(
        catchError((error: HttpErrorResponse) =>
          throwError(() => toCatalogApiError(error.status, error.error)),
        ),
      ),
    );
    return page.items.map(({ code, name }) => ({ code, name }));
  }

  async resolveServiceNames(serviceIds: readonly string[]): Promise<ReadonlyMap<string, string>> {
    const names = new Map<string, string>();

    for (let index = 0; index < serviceIds.length; index += MAX_IDS_PER_REQUEST) {
      const records = await this.read(serviceIds.slice(index, index + MAX_IDS_PER_REQUEST));

      for (const record of records) {
        names.set(record.uuid, record.name);
      }
    }

    return names;
  }

  async listServices(): Promise<readonly CertificateServiceReference[]> {
    const records = await this.read([]);

    return records
      .map((record) => ({ id: record.uuid, name: record.name }))
      .sort((left, right) => left.name.localeCompare(right.name, 'es'));
  }

  private async read(serviceIds: readonly string[]): Promise<readonly ServiceResource[]> {
    let params = new HttpParams().set('limit', String(SERVICE_PAGE_SIZE));
    if (serviceIds.length > 0) {
      params = params.set('ids', serviceIds.join(','));
    }

    const page = await firstValueFrom(
      this.http
        .get<{ readonly items: readonly ServiceResource[] }>(`${this.baseUrl}/services`, {
          params,
        })
        .pipe(
          catchError((error: HttpErrorResponse) =>
            throwError(() => toCatalogApiError(error.status, error.error)),
          ),
        ),
    );

    return page.items;
  }
}
